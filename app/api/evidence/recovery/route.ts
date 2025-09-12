import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

// Recovery request schema
const recoveryRequestSchema = z.object({
  evidenceId: z.string(),
  backupSource: z.enum(['aws-s3', 'google-cloud', 'azure-blob', 'local']).optional(),
  restoreToOriginal: z.boolean().default(true),
  newUrl: z.string().optional(),
  verifyIntegrity: z.boolean().default(true)
});

const bulkRecoverySchema = z.object({
  evidenceIds: z.array(z.string()),
  backupSource: z.enum(['aws-s3', 'google-cloud', 'azure-blob', 'local']).optional(),
  restoreToOriginal: z.boolean().default(true),
  verifyIntegrity: z.boolean().default(true)
});

// GET /api/evidence/recovery - Get recovery status and available backups
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evidenceId = searchParams.get('evidenceId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;

    const db = await getDatabase();
    const recoveryCollection = db.collection('evidence_recovery');
    const backupsCollection = db.collection('evidence_backups');

    if (evidenceId) {
      // Get specific evidence recovery info and available backups
      const [recoveryInfo, backupInfo] = await Promise.all([
        recoveryCollection.findOne({ evidenceId }),
        backupsCollection.findOne({ evidenceId })
      ]);

      if (!backupInfo) {
        return NextResponse.json(
          { success: false, error: 'No backup information found for this evidence' },
          { status: 404 }
        );
      }

      // Get available backup sources
      const availableBackups = backupInfo.backupLocations
        .filter((backup: any) => backup.status === 'active')
        .map((backup: any) => ({
          provider: backup.provider,
          url: backup.url,
          lastVerified: backup.lastVerified,
          createdAt: backup.createdAt
        }));

      return NextResponse.json({
        success: true,
        data: {
          evidenceId,
          recoveryInfo,
          availableBackups,
          canRecover: availableBackups.length > 0
        }
      });
    }

    // Get recovery operations with pagination
    const query: any = {};
    if (status) {
      query.status = status;
    }

    const [recoveries, totalCount] = await Promise.all([
      recoveryCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      recoveryCollection.countDocuments(query)
    ]);

    // Get recovery statistics
    const stats = await recoveryCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const recoveryStats = {
      total: totalCount,
      pending: stats.find((s: any) => s._id === 'pending')?.count || 0,
      inProgress: stats.find((s: any) => s._id === 'in_progress')?.count || 0,
      completed: stats.find((s: any) => s._id === 'completed')?.count || 0,
      failed: stats.find((s: any) => s._id === 'failed')?.count || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        recoveries,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        stats: recoveryStats
      }
    });

  } catch (error) {
    console.error('Recovery retrieval error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve recovery information' },
      { status: 500 }
    );
  }
}

// POST /api/evidence/recovery - Initiate evidence recovery
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if it's a bulk recovery request
    const isBulkRecovery = Array.isArray(body.evidenceIds);
    const validatedData = isBulkRecovery 
      ? bulkRecoverySchema.parse(body)
      : recoveryRequestSchema.parse(body);

    const db = await getDatabase();
    const evidenceCollection = db.collection('evidence');
    const backupsCollection = db.collection('evidence_backups');
    const recoveryCollection = db.collection('evidence_recovery');

    const evidenceIds = isBulkRecovery 
      ? (validatedData as any).evidenceIds 
      : [(validatedData as any).evidenceId];

    const recoveryJobs: any[] = [];
    const timestamp = new Date();

    for (const evidenceId of evidenceIds) {
      // Check if evidence exists and needs recovery
      const evidence = await evidenceCollection.findOne({ _id: new ObjectId(evidenceId) } as any);
      if (!evidence) {
        console.warn(`Evidence ${evidenceId} not found, skipping recovery`);
        continue;
      }

      // Get backup information
      const backupInfo = await backupsCollection.findOne({ evidenceId });
      if (!backupInfo) {
        console.warn(`No backup found for evidence ${evidenceId}, skipping recovery`);
        continue;
      }

      // Find available backup sources
      const availableBackups = backupInfo.backupLocations.filter(
        (backup: any) => backup.status === 'active'
      );

      if (availableBackups.length === 0) {
        console.warn(`No active backups found for evidence ${evidenceId}, skipping recovery`);
        continue;
      }

      // Select backup source
      let selectedBackup;
      if (validatedData.backupSource) {
        selectedBackup = availableBackups.find(
          (backup: any) => backup.provider === validatedData.backupSource
        );
      }
      if (!selectedBackup) {
        // Use the most recently verified backup
        selectedBackup = availableBackups.sort(
          (a: any, b: any) => new Date(b.lastVerified || b.createdAt).getTime() - 
                              new Date(a.lastVerified || a.createdAt).getTime()
        )[0];
      }

      // Create recovery job
      const recoveryJob = {
        evidenceId,
        originalUrl: evidence.url,
        backupSource: selectedBackup.provider,
        backupUrl: selectedBackup.url,
        restoreToOriginal: validatedData.restoreToOriginal,
        newUrl: (validatedData as any).newUrl,
        verifyIntegrity: validatedData.verifyIntegrity,
        status: 'pending',
        progress: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        metadata: {
          originalFileSize: evidence.fileSize,
          originalMimeType: evidence.mimeType,
          backupCreatedAt: selectedBackup.createdAt,
          backupLastVerified: selectedBackup.lastVerified
        }
      };

      // Save recovery job
      const result = await recoveryCollection.insertOne(recoveryJob);
      (recoveryJob as any)._id = result.insertedId;

      recoveryJobs.push({
        recoveryId: result.insertedId.toString(),
        evidenceId,
        status: 'pending',
        backupSource: selectedBackup.provider
      });
    }

    if (recoveryJobs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No evidence files could be queued for recovery' },
        { status: 400 }
      );
    }

    // In a real implementation, you would queue these jobs for processing
    // For now, we'll simulate the recovery process
    setTimeout(async () => {
      await simulateRecoveryProcess(recoveryJobs, db);
    }, 1000);

    return NextResponse.json({
      success: true,
      data: {
        message: `Recovery initiated for ${recoveryJobs.length} evidence files`,
        jobs: recoveryJobs
      }
    });

  } catch (error) {
    console.error('Recovery initiation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid recovery request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to initiate recovery' },
      { status: 500 }
    );
  }
}

// PUT /api/evidence/recovery - Update recovery job status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { recoveryId, status, progress, error, newUrl } = body;

    if (!recoveryId) {
      return NextResponse.json(
        { success: false, error: 'recoveryId is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const recoveryCollection = db.collection('evidence_recovery');

    const updateFields: any = {
      updatedAt: new Date()
    };

    if (status) updateFields.status = status;
    if (progress !== undefined) updateFields.progress = progress;
    if (error) updateFields.error = error;
    if (newUrl) updateFields.newUrl = newUrl;

    const result = await recoveryCollection.updateOne(
      { _id: new ObjectId(recoveryId) } as any,
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Recovery job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Recovery job updated successfully' }
    });

  } catch (error) {
    console.error('Recovery update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update recovery job' },
      { status: 500 }
    );
  }
}

// DELETE /api/evidence/recovery - Cancel recovery job
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recoveryId = searchParams.get('recoveryId');

    if (!recoveryId) {
      return NextResponse.json(
        { success: false, error: 'recoveryId is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const recoveryCollection = db.collection('evidence_recovery');

    // Get recovery job
    const recoveryJob = await recoveryCollection.findOne({ _id: new ObjectId(recoveryId) } as any);
    if (!recoveryJob) {
      return NextResponse.json(
        { success: false, error: 'Recovery job not found' },
        { status: 404 }
      );
    }

    // Only allow cancellation of pending or in_progress jobs
    if (!['pending', 'in_progress'].includes(recoveryJob.status)) {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel completed or failed recovery jobs' },
        { status: 400 }
      );
    }

    // Update status to cancelled
    await recoveryCollection.updateOne(
      { _id: new ObjectId(recoveryId) } as any,
      {
        $set: {
          status: 'cancelled',
          updatedAt: new Date(),
          cancelledAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Recovery job cancelled successfully' }
    });

  } catch (error) {
    console.error('Recovery cancellation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel recovery job' },
      { status: 500 }
    );
  }
}

// Simulate recovery process (in a real app, this would be handled by a job queue)
async function simulateRecoveryProcess(jobs: any[], db: any) {
  const recoveryCollection = db.collection('evidence_recovery');
  const evidenceCollection = db.collection('evidence');
  
  for (const job of jobs) {
    try {
      const recoveryId = new ObjectId(job.recoveryId);
      
      // Update status to in_progress
      await recoveryCollection.updateOne(
        { _id: recoveryId },
        {
          $set: {
            status: 'in_progress',
            progress: 0,
            updatedAt: new Date()
          }
        }
      );

      // Simulate recovery steps with progress updates
      const steps = [
        { progress: 20, message: 'Verifying backup integrity' },
        { progress: 40, message: 'Downloading from backup source' },
        { progress: 60, message: 'Validating file integrity' },
        { progress: 80, message: 'Restoring to original location' },
        { progress: 100, message: 'Recovery completed' }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        await recoveryCollection.updateOne(
          { _id: recoveryId },
          {
            $set: {
              progress: step.progress,
              currentStep: step.message,
              updatedAt: new Date()
            }
          }
        );
      }

      // Simulate 85% success rate
      if (Math.random() > 0.15) {
        // Recovery successful
        const newUrl = `https://recovered-evidence.example.com/${job.evidenceId}`;
        
        await Promise.all([
          // Update recovery job
          recoveryCollection.updateOne(
            { _id: recoveryId },
            {
              $set: {
                status: 'completed',
                progress: 100,
                newUrl,
                completedAt: new Date(),
                updatedAt: new Date()
              }
            }
          ),
          // Update evidence with new URL
          evidenceCollection.updateOne(
            { _id: new ObjectId(job.evidenceId) } as any,
            {
              $set: {
                url: newUrl,
                recoveredAt: new Date(),
                recoveredFrom: job.backupSource,
                updatedAt: new Date()
              }
            }
          )
        ]);
      } else {
        // Recovery failed
        await recoveryCollection.updateOne(
          { _id: recoveryId },
          {
            $set: {
              status: 'failed',
              error: 'Failed to restore file from backup',
              failedAt: new Date(),
              updatedAt: new Date()
            }
          }
        );
      }

    } catch (error) {
      console.error(`Recovery failed for job ${job.recoveryId}:`, error);
      
      await recoveryCollection.updateOne(
        { _id: new ObjectId(job.recoveryId) } as any,
        {
          $set: {
            status: 'failed',
            error: (error as Error).message || 'Unknown recovery error',
            failedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );
    }
  }
}