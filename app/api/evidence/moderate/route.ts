import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';
import { Evidence, COLLECTIONS } from '../../../../lib/models';
import { ObjectId } from 'mongodb';
import { logger, createRequestContext, PerformanceMonitor } from '../../../../lib/logger';
import { handleApiError, ValidationError, NotFoundError, AuthorizationError } from '../../../../lib/errors';
import { validateQueryParams, validateRequestBody } from '../../../../lib/validation';

interface ModerationAction {
  _id?: ObjectId;
  evidenceId: string;
  adminId: string;
  action: 'approve' | 'reject' | 'flag' | 'unflag';
  reason: string;
  notes?: string;
  createdAt: Date;
}

// GET /api/evidence/moderate - Get evidence pending moderation
export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('GET /api/evidence/moderate');
  
  try {
    logger.apiRequest('GET', '/api/evidence/moderate', undefined, context.ip, context.requestId);
    
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const querySchema = {
      status: {
        required: false,
        type: 'string' as const,
        enum: ['pending', 'flagged', 'all'],
      },
      page: {
        required: false,
        type: 'number' as const,
        min: 1,
      },
      limit: {
        required: false,
        type: 'number' as const,
        min: 1,
        max: 100,
      },
      adminId: {
        required: true,
        type: 'string' as const,
        pattern: /^0x[a-fA-F0-9]{40}$/,
      },
    };
    
    const validatedQuery = validateQueryParams(searchParams, querySchema);
    const { status = 'pending', page = 1, limit = 20, adminId } = validatedQuery;

    // TODO: Add admin authorization check here
    // For now, we'll assume the adminId is valid

    const db = await getDatabase();
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);

    // Build query based on status
    let query: any = {};
    if (status === 'pending') {
      query = { isVerified: { $ne: true }, isFlagged: { $ne: true } };
    } else if (status === 'flagged') {
      query = { isFlagged: true };
    }
    // 'all' status returns all evidence

    const skip = (page - 1) * limit;

    // Get evidence with pagination
    const dbMonitor = new PerformanceMonitor('Database find');
    const [evidence, totalCount] = await Promise.all([
      evidenceCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      evidenceCollection.countDocuments(query)
    ]);
    dbMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'find' });

    const totalPages = Math.ceil(totalCount / limit);

    const duration = monitor.end(true);
    logger.apiResponse('GET', '/api/evidence/moderate', 200, duration, undefined, context.ip, context.requestId);
    
    return NextResponse.json({
      success: true,
      evidence,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    const duration = monitor.end(false);
    logger.apiResponse('GET', '/api/evidence/moderate', 500, duration, String(error), context.ip, context.requestId);
    return handleApiError(error, context.requestId);
  }
}

// POST /api/evidence/moderate - Take moderation action on evidence
export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('POST /api/evidence/moderate');
  
  try {
    logger.apiRequest('POST', '/api/evidence/moderate', undefined, context.ip, context.requestId);
    
    // Validate request body
    const moderationSchema = {
      evidenceId: {
        required: true,
        type: 'string' as const,
        pattern: /^[0-9a-fA-F]{24}$/,
      },
      adminId: {
        required: true,
        type: 'string' as const,
        pattern: /^0x[a-fA-F0-9]{40}$/,
      },
      action: {
        required: true,
        type: 'string' as const,
        enum: ['approve', 'reject', 'flag', 'unflag'],
      },
      reason: {
        required: true,
        type: 'string' as const,
        minLength: 5,
        maxLength: 500,
      },
      notes: {
        required: false,
        type: 'string' as const,
        maxLength: 1000,
      },
    };
    
    const validatedData = await validateRequestBody(request, moderationSchema);
    const { evidenceId, adminId, action, reason, notes } = validatedData;

    const db = await getDatabase();
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);
    const moderationCollection = db.collection<ModerationAction>('moderation_actions');

    // Check if evidence exists
    const dbMonitor = new PerformanceMonitor('Database findOne');
    const evidence = await evidenceCollection.findOne({ _id: new ObjectId(evidenceId) } as any);
    dbMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'findOne' });
    
    if (!evidence) {
      throw new NotFoundError('Evidence', { evidenceId });
    }

    // Prepare update based on action
    const updateData: any = {
      updatedAt: new Date(),
      lastModeratedBy: adminId,
      lastModeratedAt: new Date()
    };

    switch (action) {
      case 'approve':
        updateData.isVerified = true;
        updateData.isFlagged = false;
        updateData.verifiedAt = new Date();
        updateData.verifiedBy = adminId;
        break;
      case 'reject':
        updateData.isVerified = false;
        updateData.isRejected = true;
        updateData.rejectedAt = new Date();
        updateData.rejectedBy = adminId;
        updateData.rejectionReason = reason;
        break;
      case 'flag':
        updateData.isFlagged = true;
        updateData.flaggedAt = new Date();
        updateData.flaggedBy = adminId;
        updateData.flagReason = reason;
        break;
      case 'unflag':
        updateData.isFlagged = false;
        updateData.unflaggedAt = new Date();
        updateData.unflaggedBy = adminId;
        break;
    }

    // Update evidence
    const updateMonitor = new PerformanceMonitor('Database updateOne');
    const updateResult = await evidenceCollection.updateOne(
      { _id: new ObjectId(evidenceId) } as any,
      { $set: updateData }
    );
    updateMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'updateOne' });

    if (updateResult.matchedCount === 0) {
      throw new NotFoundError('Evidence', { evidenceId });
    }

    // Log moderation action
    const moderationAction: ModerationAction = {
      evidenceId,
      adminId,
      action,
      reason,
      notes,
      createdAt: new Date()
    };

    const logMonitor = new PerformanceMonitor('Database insertOne');
    await moderationCollection.insertOne(moderationAction);
    logMonitor.end(true, { collection: 'moderation_actions', operation: 'insertOne' });

    const duration = monitor.end(true);
    logger.apiResponse('POST', '/api/evidence/moderate', 200, duration, undefined, context.ip, context.requestId);
    
    return NextResponse.json({
      success: true,
      message: `Evidence ${action}ed successfully`,
      evidenceId,
      action,
      moderatedAt: new Date().toISOString()
    });

  } catch (error) {
    const duration = monitor.end(false);
    logger.apiResponse('POST', '/api/evidence/moderate', 500, duration, String(error), context.ip, context.requestId);
    return handleApiError(error, context.requestId);
  }
}

// PUT /api/evidence/moderate - Bulk moderation actions
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('PUT /api/evidence/moderate');
  
  try {
    logger.apiRequest('PUT', '/api/evidence/moderate', undefined, context.ip, context.requestId);
    
    // Validate request body
    const bulkModerationSchema = {
      evidenceIds: {
        required: true,
        type: 'array' as const,
        arrayOf: {
          type: 'string' as const,
          pattern: /^[0-9a-fA-F]{24}$/,
        },
      },
      adminId: {
        required: true,
        type: 'string' as const,
        pattern: /^0x[a-fA-F0-9]{40}$/,
      },
      action: {
        required: true,
        type: 'string' as const,
        enum: ['approve', 'reject', 'flag', 'unflag'],
      },
      reason: {
        required: true,
        type: 'string' as const,
        minLength: 5,
        maxLength: 500,
      },
      notes: {
        required: false,
        type: 'string' as const,
        maxLength: 1000,
      },
    };
    
    const validatedData = await validateRequestBody(request, bulkModerationSchema);
    const { evidenceIds, adminId, action, reason, notes } = validatedData;

    if (evidenceIds.length > 50) {
      throw new ValidationError('Cannot moderate more than 50 evidence items at once');
    }

    const db = await getDatabase();
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);
    const moderationCollection = db.collection<ModerationAction>('moderation_actions');

    // Prepare update based on action
    const updateData: any = {
      updatedAt: new Date(),
      lastModeratedBy: adminId,
      lastModeratedAt: new Date()
    };

    switch (action) {
      case 'approve':
        updateData.isVerified = true;
        updateData.isFlagged = false;
        updateData.verifiedAt = new Date();
        updateData.verifiedBy = adminId;
        break;
      case 'reject':
        updateData.isVerified = false;
        updateData.isRejected = true;
        updateData.rejectedAt = new Date();
        updateData.rejectedBy = adminId;
        updateData.rejectionReason = reason;
        break;
      case 'flag':
        updateData.isFlagged = true;
        updateData.flaggedAt = new Date();
        updateData.flaggedBy = adminId;
        updateData.flagReason = reason;
        break;
      case 'unflag':
        updateData.isFlagged = false;
        updateData.unflaggedAt = new Date();
        updateData.unflaggedBy = adminId;
        break;
    }

    // Bulk update evidence
    const updateMonitor = new PerformanceMonitor('Database updateMany');
    const updateResult = await evidenceCollection.updateMany(
      { _id: { $in: evidenceIds.map((id: string) => new ObjectId(id)) } } as any,
      { $set: updateData }
    );
    updateMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'updateMany' });

    // Log bulk moderation actions
    const moderationActions: ModerationAction[] = evidenceIds.map((evidenceId: string) => ({
      evidenceId,
      adminId,
      action,
      reason,
      notes,
      createdAt: new Date()
    }));

    const logMonitor = new PerformanceMonitor('Database insertMany');
    await moderationCollection.insertMany(moderationActions);
    logMonitor.end(true, { collection: 'moderation_actions', operation: 'insertMany' });

    const duration = monitor.end(true);
    logger.apiResponse('PUT', '/api/evidence/moderate', 200, duration, undefined, context.ip, context.requestId);
    
    return NextResponse.json({
      success: true,
      message: `${updateResult.modifiedCount} evidence items ${action}ed successfully`,
      modifiedCount: updateResult.modifiedCount,
      totalRequested: evidenceIds.length
    });

  } catch (error) {
    const duration = monitor.end(false);
    logger.apiResponse('PUT', '/api/evidence/moderate', 500, duration, String(error), context.ip, context.requestId);
    return handleApiError(error, context.requestId);
  }
}

// DELETE /api/evidence/moderate - Get moderation history
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('DELETE /api/evidence/moderate');
  
  try {
    logger.apiRequest('DELETE', '/api/evidence/moderate', undefined, context.ip, context.requestId);
    
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const querySchema = {
      evidenceId: {
        required: false,
        type: 'string' as const,
        pattern: /^[0-9a-fA-F]{24}$/,
      },
      adminId: {
        required: false,
        type: 'string' as const,
        pattern: /^0x[a-fA-F0-9]{40}$/,
      },
      page: {
        required: false,
        type: 'number' as const,
        min: 1,
      },
      limit: {
        required: false,
        type: 'number' as const,
        min: 1,
        max: 100,
      },
    };
    
    const validatedQuery = validateQueryParams(searchParams, querySchema);
    const { evidenceId, adminId, page = 1, limit = 20 } = validatedQuery;

    const db = await getDatabase();
    const moderationCollection = db.collection<ModerationAction>('moderation_actions');

    // Build query
    const query: any = {};
    if (evidenceId) query.evidenceId = evidenceId;
    if (adminId) query.adminId = adminId;

    const skip = (page - 1) * limit;

    // Get moderation history with pagination
    const dbMonitor = new PerformanceMonitor('Database find');
    const [actions, totalCount] = await Promise.all([
      moderationCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      moderationCollection.countDocuments(query)
    ]);
    dbMonitor.end(true, { collection: 'moderation_actions', operation: 'find' });

    const totalPages = Math.ceil(totalCount / limit);

    const duration = monitor.end(true);
    logger.apiResponse('DELETE', '/api/evidence/moderate', 200, duration, undefined, context.ip, context.requestId);
    
    return NextResponse.json({
      success: true,
      actions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    const duration = monitor.end(false);
    logger.apiResponse('DELETE', '/api/evidence/moderate', 500, duration, String(error), context.ip, context.requestId);
    return handleApiError(error, context.requestId);
  }
}