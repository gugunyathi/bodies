import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/mongodb';
import { Evidence, COLLECTIONS } from '../../../lib/models';
import { ObjectId } from 'mongodb';
import { logger, createRequestContext, PerformanceMonitor } from '../../../lib/logger';
import { handleApiError, ValidationError, NotFoundError, AuthorizationError, handleMongoError } from '../../../lib/errors';
import { validateQueryParams, validateRequestBody, schemas } from '../../../lib/validation';

// GET /api/evidence - Get evidence by ID or rating ID
export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('GET /api/evidence');
  
  try {
    logger.apiRequest('GET', '/api/evidence', undefined, context.ip, context.requestId);
    
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const querySchema = {
      id: {
        required: false,
        type: 'string' as const,
        pattern: /^[0-9a-fA-F]{24}$/,
      },
      ratingId: {
        required: false,
        type: 'string' as const,
        minLength: 1,
        maxLength: 100,
      },
      limit: {
        required: false,
        type: 'number' as const,
        min: 1,
        max: 100,
      },
    };
    
    const validatedQuery = validateQueryParams(searchParams, querySchema);
    const { id: evidenceId, ratingId, limit = 50 } = validatedQuery;

    if (!evidenceId && !ratingId) {
      throw new ValidationError('Either evidenceId or ratingId is required');
    }

    const db = await getDatabase();
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);

    if (evidenceId) {
      // Get specific evidence by ID
      const dbMonitor = new PerformanceMonitor('Database findOne');
      const evidence = await evidenceCollection.findOne({ _id: evidenceId });
      dbMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'findOne' });
      
      if (!evidence) {
        throw new NotFoundError('Evidence', { evidenceId });
      }

      return NextResponse.json({
        success: true,
        evidence: {
          id: evidence._id,
          ratingId: evidence.ratingId,
          uploaderId: evidence.uploaderId,
          type: evidence.type,
          url: evidence.url,
          filename: evidence.filename,
          fileSize: evidence.fileSize,
          mimeType: evidence.mimeType,
          description: evidence.description,
          isVerified: evidence.isVerified,
          createdAt: evidence.createdAt
        }
      });
    }

    if (ratingId) {
      // Get all evidence for a rating
      const dbMonitor = new PerformanceMonitor('Database find');
      const evidenceList = await evidenceCollection
        .find({ ratingId: ratingId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      dbMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'find', count: evidenceList.length });

      return NextResponse.json({
        success: true,
        evidence: evidenceList.map(evidence => ({
          id: evidence._id,
          ratingId: evidence.ratingId,
          uploaderId: evidence.uploaderId,
          type: evidence.type,
          url: evidence.url,
          filename: evidence.filename,
          fileSize: evidence.fileSize,
          mimeType: evidence.mimeType,
          description: evidence.description,
          isVerified: evidence.isVerified,
          createdAt: evidence.createdAt
        }))
      });
    }

    // This should never be reached due to validation above, but TypeScript requires it
    throw new ValidationError('Either evidenceId or ratingId is required');

  } catch (error) {
    const duration = monitor.end(false);
    logger.apiResponse('GET', '/api/evidence', error instanceof ValidationError ? 400 : 500, duration, undefined, context.ip, context.requestId);
    return handleApiError(error, context.requestId, undefined, context.ip);
  }
}

// POST /api/evidence - Upload new evidence
export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('POST /api/evidence');
  
  try {
    logger.apiRequest('POST', '/api/evidence', undefined, context.ip, context.requestId);
    
    // Validate request body
    const evidenceSchema = {
      ratingId: {
        required: true,
        type: 'string' as const,
        minLength: 1,
        maxLength: 100,
      },
      uploaderId: {
        required: true,
        type: 'string' as const,
        pattern: /^0x[a-fA-F0-9]{40}$/,
      },
      type: {
        required: true,
        type: 'string' as const,
        enum: ['image', 'video', 'link', 'text'] as const,
      },
      url: {
        required: false,
        type: 'string' as const,
        pattern: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
      },
      filename: {
        required: false,
        type: 'string' as const,
        maxLength: 255,
      },
      fileSize: {
        required: false,
        type: 'number' as const,
        min: 0,
        max: 100 * 1024 * 1024, // 100MB max
      },
      mimeType: {
        required: false,
        type: 'string' as const,
        maxLength: 100,
      },
      description: {
        required: false,
        type: 'string' as const,
        maxLength: 2000,
      },
      textContent: {
        required: false,
        type: 'string' as const,
        maxLength: 10000,
      },
      textTitle: {
        required: false,
        type: 'string' as const,
        maxLength: 200,
      },
    };
    
    const validatedData = await validateRequestBody(request, evidenceSchema);

    const db = await getDatabase();
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);

    const newEvidence: Omit<Evidence, '_id'> = {
      ratingId: validatedData.ratingId,
      uploaderId: validatedData.uploaderId,
      type: validatedData.type as 'image' | 'video' | 'link' | 'text',
      url: validatedData.url || '',
      filename: validatedData.filename || '',
      fileSize: validatedData.fileSize || 0,
      mimeType: validatedData.mimeType || '',
      description: validatedData.description || '',
      textContent: validatedData.textContent || '',
      textTitle: validatedData.textTitle || '',
      isVerified: false,
      createdAt: new Date()
    };

    const dbMonitor = new PerformanceMonitor('Database insertOne');
    const result = await evidenceCollection.insertOne(newEvidence);
    dbMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'insertOne' });
    const evidence = { ...newEvidence, _id: result.insertedId };

    const duration = monitor.end(true);
    logger.apiResponse('POST', '/api/evidence', 201, duration, undefined, context.ip, context.requestId);
    
    return NextResponse.json({
      success: true,
      evidence: {
        id: evidence._id?.toString(),
        ratingId: evidence.ratingId,
        uploaderId: evidence.uploaderId,
        type: evidence.type,
        url: evidence.url,
        filename: evidence.filename,
        fileSize: evidence.fileSize,
        mimeType: evidence.mimeType,
        description: evidence.description,
        textContent: evidence.textContent,
        textTitle: evidence.textTitle,
        isVerified: evidence.isVerified,
        createdAt: evidence.createdAt
      }
    });
  } catch (error) {
    const duration = monitor.end(false);
    
    // Handle MongoDB-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const mongoError = handleMongoError(error);
      logger.apiResponse('POST', '/api/evidence', mongoError.statusCode, duration, undefined, context.ip, context.requestId);
      return handleApiError(mongoError, context.requestId, undefined, context.ip);
    }
    
    logger.apiResponse('POST', '/api/evidence', error instanceof ValidationError ? 400 : 500, duration, undefined, context.ip, context.requestId);
    return handleApiError(error, context.requestId, undefined, context.ip);
  }
}

// DELETE /api/evidence - Delete evidence by ID
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('DELETE /api/evidence');
  
  try {
    logger.apiRequest('DELETE', '/api/evidence', undefined, context.ip, context.requestId);
    
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const querySchema = {
      id: {
        required: true,
        type: 'string' as const,
        pattern: /^[0-9a-fA-F]{24}$/,
      },
      uploaderId: {
        required: false,
        type: 'string' as const,
        pattern: /^0x[a-fA-F0-9]{40}$/,
      },
    };
    
    const validatedQuery = validateQueryParams(searchParams, querySchema);
    const { id: evidenceId, uploaderId } = validatedQuery;

    const db = await getDatabase();
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);

    // Check if evidence exists and user has permission to delete
    const findMonitor = new PerformanceMonitor('Database findOne');
    const evidence = await evidenceCollection.findOne({ _id: evidenceId });
    findMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'findOne' });
    
    if (!evidence) {
      throw new NotFoundError('Evidence', { evidenceId });
    }

    // Only allow uploader to delete their own evidence
    if (uploaderId && evidence.uploaderId !== uploaderId) {
      logger.securityEvent(
        'Unauthorized deletion attempt',
        'medium',
        { evidenceId, requestedBy: uploaderId, actualUploader: evidence.uploaderId },
        uploaderId,
        context.ip
      );
      throw new AuthorizationError('Unauthorized to delete this evidence', { evidenceId, uploaderId });
    }

    const deleteMonitor = new PerformanceMonitor('Database deleteOne');
    await evidenceCollection.deleteOne({ _id: evidenceId });
    deleteMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'deleteOne' });

    return NextResponse.json({
      success: true,
      message: 'Evidence deleted successfully'
    });
  } catch (error) {
    const duration = monitor.end(false);
    
    // Handle MongoDB-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const mongoError = handleMongoError(error);
      logger.apiResponse('DELETE', '/api/evidence', mongoError.statusCode, duration, undefined, context.ip, context.requestId);
      return handleApiError(mongoError, context.requestId, undefined, context.ip);
    }
    
    const statusCode = error instanceof ValidationError ? 400 : 
                      error instanceof NotFoundError ? 404 : 
                      error instanceof AuthorizationError ? 403 : 500;
    
    logger.apiResponse('DELETE', '/api/evidence', statusCode, duration, undefined, context.ip, context.requestId);
    return handleApiError(error, context.requestId, undefined, context.ip);
  }
  
  const duration = monitor.end(true);
  logger.apiResponse('DELETE', '/api/evidence', 200, duration, undefined, context.ip, context.requestId);
}