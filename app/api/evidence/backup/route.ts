import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

// Backup configuration schema
const backupConfigSchema = z.object({
  evidenceId: z.string(),
  backupLocations: z.array(z.object({
    provider: z.enum(['aws-s3', 'google-cloud', 'azure-blob', 'local']),
    url: z.string(),
    status: z.enum(['active', 'pending', 'failed', 'archived']),
    createdAt: z.date().optional(),
    lastVerified: z.date().optional()
  })),
  retentionPolicy: z.object({
    keepDays: z.number().min(1),
    maxBackups: z.number().min(1)
  }).optional()
});

const backupRequestSchema = z.object({
  evidenceIds: z.array(z.string()).optional(),
  backupAll: z.boolean().optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  retentionDays: z.number().min(1).max(365).default(30)
});

// GET /api/evidence/backup - Get backup status and configurations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evidenceId = searchParams.get('evidenceId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;

    const db = await getDatabase();
    const backupsCollection = db.collection('evidence_backups');

    // Build query
    const query: any = {};
    if (evidenceId) {
      query.evidenceId = evidenceId;
    }
    if (status) {
      query['backupLocations.status'] = status;
    }

    // Get backups with pagination
    const [backups, totalCount] = await Promise.all([
      backupsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      backupsCollection.countDocuments(query)
    ]);

    // Get backup statistics
    const stats = await backupsCollection.aggregate([
      {
        $group: {
          _id: null,
          totalBackups: { $sum: 1 },
          activeBackups: {
            $sum: {
              $size: {
                $filter: {
                  input: '$backupLocations',
                  cond: { $eq: ['$$this.status', 'active'] }
                }
              }
            }
          },
          failedBackups: {
            $sum: {
              $size: {
                $filter: {
                  input: '$backupLocations',
                  cond: { $eq: ['$$this.status', 'failed'] }
                }
              }
            }
          },
          pendingBackups: {
            $sum: {
              $size: {
                $filter: {
                  input: '$backupLocations',
                  cond: { $eq: ['$$this.status', 'pending'] }
                }
              }
            }
          }
        }
      }
    ]).toArray();

    const backupStats = stats[0] || {
      totalBackups: 0,
      activeBackups: 0,
      failedBackups: 0,
      pendingBackups: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        backups,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        stats: backupStats
      }
    });

  } catch (error) {
    console.error('Backup retrieval error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve backup information' },
      { status: 500 }
    );
  }
}

// POST /api/evidence/backup - Create or update backup configurations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = backupRequestSchema.parse(body);

    const db = await getDatabase();
    const evidenceCollection = db.collection('evidence');
    const backupsCollection = db.collection('evidence_backups');

    let evidenceIds: string[] = [];

    if (validatedData.backupAll) {
      // Get all evidence IDs
      const allEvidence = await evidenceCollection
        .find({}, { projection: { _id: 1 } })
        .toArray();
      evidenceIds = allEvidence.map(e => e._id.toString());
    } else if (validatedData.evidenceIds) {
      evidenceIds = validatedData.evidenceIds;
    } else {
      return NextResponse.json(
        { success: false, error: 'Either evidenceIds or backupAll must be specified' },
        { status: 400 }
      );
    }

    const backupJobs: any[] = [];
    const timestamp = new Date();

    for (const evidenceId of evidenceIds) {
      // Verify evidence exists
      const evidence = await evidenceCollection.findOne({ _id: new ObjectId(evidenceId) } as any);
      if (!evidence) {
        console.warn(`Evidence ${evidenceId} not found, skipping backup`);
        continue;
      }

      // Create backup configuration
      const backupConfig = {
        evidenceId,
        originalUrl: evidence.url,
        fileSize: evidence.fileSize || 0,
        mimeType: evidence.mimeType,
        backupLocations: [
          {
            provider: 'aws-s3' as const,
            url: `s3://evidence-backup/${evidenceId}`,
            status: 'pending' as const,
            createdAt: timestamp
          },
          {
            provider: 'local' as const,
            url: `/backup/evidence/${evidenceId}`,
            status: 'pending' as const,
            createdAt: timestamp
          }
        ],
        retentionPolicy: {
          keepDays: validatedData.retentionDays,
          maxBackups: 3
        },
        priority: validatedData.priority,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Upsert backup configuration
      await backupsCollection.updateOne(
        { evidenceId },
        { $set: backupConfig },
        { upsert: true }
      );

      backupJobs.push({
        evidenceId,
        status: 'queued',
        priority: validatedData.priority
      });
    }

    // In a real implementation, you would queue these jobs for processing
    // For now, we'll simulate the backup process
    setTimeout(async () => {
      await simulateBackupProcess(backupJobs, db);
    }, 1000);

    return NextResponse.json({
      success: true,
      data: {
        message: `Backup initiated for ${backupJobs.length} evidence files`,
        jobs: backupJobs
      }
    });

  } catch (error) {
    console.error('Backup creation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

// PUT /api/evidence/backup - Update backup status or configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { evidenceId, backupLocationIndex, status, url, lastVerified } = body;

    if (!evidenceId || backupLocationIndex === undefined) {
      return NextResponse.json(
        { success: false, error: 'evidenceId and backupLocationIndex are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const backupsCollection = db.collection('evidence_backups');

    const updateFields: any = {
      updatedAt: new Date()
    };

    if (status) {
      updateFields[`backupLocations.${backupLocationIndex}.status`] = status;
    }
    if (url) {
      updateFields[`backupLocations.${backupLocationIndex}.url`] = url;
    }
    if (lastVerified) {
      updateFields[`backupLocations.${backupLocationIndex}.lastVerified`] = new Date(lastVerified);
    }

    const result = await backupsCollection.updateOne(
      { evidenceId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Backup configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Backup configuration updated successfully' }
    });

  } catch (error) {
    console.error('Backup update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update backup configuration' },
      { status: 500 }
    );
  }
}

// DELETE /api/evidence/backup - Delete backup configurations
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evidenceId = searchParams.get('evidenceId');
    const deleteFiles = searchParams.get('deleteFiles') === 'true';

    if (!evidenceId) {
      return NextResponse.json(
        { success: false, error: 'evidenceId is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const backupsCollection = db.collection('evidence_backups');

    // Get backup configuration before deletion
    const backupConfig = await backupsCollection.findOne({ evidenceId });
    if (!backupConfig) {
      return NextResponse.json(
        { success: false, error: 'Backup configuration not found' },
        { status: 404 }
      );
    }

    // If deleteFiles is true, mark backup files for deletion
    if (deleteFiles) {
      // In a real implementation, you would queue deletion jobs
      console.log(`Queuing deletion of backup files for evidence ${evidenceId}`);
    }

    // Delete backup configuration
    await backupsCollection.deleteOne({ evidenceId });

    return NextResponse.json({
      success: true,
      data: { message: 'Backup configuration deleted successfully' }
    });

  } catch (error) {
    console.error('Backup deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete backup configuration' },
      { status: 500 }
    );
  }
}

// Simulate backup process (in a real app, this would be handled by a job queue)
async function simulateBackupProcess(jobs: any[], db: any) {
  const backupsCollection = db.collection('evidence_backups');
  
  for (const job of jobs) {
    try {
      // Simulate backup to different locations
      const backupResults = await Promise.allSettled([
        simulateS3Backup(job.evidenceId),
        simulateLocalBackup(job.evidenceId)
      ]);

      // Update backup status based on results
      const updates: any = {
        updatedAt: new Date()
      };

      backupResults.forEach((result, index) => {
        const status = result.status === 'fulfilled' ? 'active' : 'failed';
        updates[`backupLocations.${index}.status`] = status;
        if (result.status === 'fulfilled') {
          updates[`backupLocations.${index}.lastVerified`] = new Date();
        }
      });

      await backupsCollection.updateOne(
        { evidenceId: job.evidenceId },
        { $set: updates }
      );

    } catch (error) {
      console.error(`Backup failed for evidence ${job.evidenceId}:`, error);
      
      // Mark all backup locations as failed
      await backupsCollection.updateOne(
        { evidenceId: job.evidenceId },
        {
          $set: {
            'backupLocations.$[].status': 'failed',
            updatedAt: new Date()
          }
        }
      );
    }
  }
}

// Simulate S3 backup (replace with actual S3 implementation)
async function simulateS3Backup(evidenceId: string): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
  
  // Simulate 90% success rate
  if (Math.random() > 0.1) {
    return `s3://evidence-backup/${evidenceId}`;
  } else {
    throw new Error('S3 backup failed');
  }
}

// Simulate local backup (replace with actual file system operations)
async function simulateLocalBackup(evidenceId: string): Promise<string> {
  // Simulate file copy delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  
  // Simulate 95% success rate
  if (Math.random() > 0.05) {
    return `/backup/evidence/${evidenceId}`;
  } else {
    throw new Error('Local backup failed');
  }
}