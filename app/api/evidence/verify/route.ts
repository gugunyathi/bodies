import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';
import { Evidence, COLLECTIONS } from '../../../../lib/models';
import { ObjectId } from 'mongodb';
import { logger, createRequestContext, PerformanceMonitor } from '../../../../lib/logger';
import { handleApiError, ValidationError, NotFoundError, AuthorizationError } from '../../../../lib/errors';
import { validateQueryParams, validateRequestBody } from '../../../../lib/validation';

// Content moderation keywords (basic implementation)
const INAPPROPRIATE_KEYWORDS = [
  'explicit', 'nude', 'nsfw', 'porn', 'sex', 'xxx',
  'violence', 'hate', 'harassment', 'abuse',
  'illegal', 'drugs', 'weapon', 'threat'
];

// Automated content moderation
function performContentModeration(evidence: Evidence): {
  isAppropriate: boolean;
  flags: string[];
  confidence: number;
} {
  const flags: string[] = [];
  let inappropriateScore = 0;

  // Check description for inappropriate content
  if (evidence.description) {
    const description = evidence.description.toLowerCase();
    INAPPROPRIATE_KEYWORDS.forEach(keyword => {
      if (description.includes(keyword)) {
        flags.push(`Inappropriate keyword: ${keyword}`);
        inappropriateScore += 0.3;
      }
    });
  }

  // Check filename for inappropriate content
  if (evidence.filename) {
    const filename = evidence.filename.toLowerCase();
    INAPPROPRIATE_KEYWORDS.forEach(keyword => {
      if (filename.includes(keyword)) {
        flags.push(`Inappropriate filename: ${keyword}`);
        inappropriateScore += 0.2;
      }
    });
  }

  // Check file type restrictions
  if (evidence.type === 'link') {
    // Basic URL validation for suspicious domains
    const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'goo.gl'];
    const url = evidence.url?.toLowerCase() || '';
    suspiciousDomains.forEach(domain => {
      if (url.includes(domain)) {
        flags.push(`Suspicious URL shortener: ${domain}`);
        inappropriateScore += 0.1;
      }
    });
  }

  // File size checks
  if (evidence.fileSize && evidence.fileSize > 50 * 1024 * 1024) { // 50MB
    flags.push('Large file size may indicate inappropriate content');
    inappropriateScore += 0.1;
  }

  const confidence = Math.min(inappropriateScore, 1.0);
  const isAppropriate = inappropriateScore < 0.5;

  return { isAppropriate, flags, confidence };
}

// POST /api/evidence/verify - Verify evidence (admin only)
export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('POST /api/evidence/verify');
  
  try {
    logger.apiRequest('POST', '/api/evidence/verify', undefined, context.ip, context.requestId);
    
    // Validate request body
    const verificationSchema = {
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
      isVerified: {
        required: true,
        type: 'boolean' as const,
      },
      adminNotes: {
        required: false,
        type: 'string' as const,
        maxLength: 1000,
      },
    };
    
    const validatedData = await validateRequestBody(request, verificationSchema);
    const { evidenceId, adminId, isVerified, adminNotes } = validatedData;

    const db = await getDatabase();
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);

    // Check if evidence exists
    const dbMonitor = new PerformanceMonitor('Database findOne');
    const evidence = await evidenceCollection.findOne({ _id: new ObjectId(evidenceId) } as any);
    dbMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'findOne' });
    
    if (!evidence) {
      throw new NotFoundError('Evidence', { evidenceId });
    }

    // Update evidence verification status
    const updateMonitor = new PerformanceMonitor('Database updateOne');
    const updateResult = await evidenceCollection.updateOne(
      { _id: new ObjectId(evidenceId) } as any,
      {
        $set: {
          isVerified,
          verifiedAt: new Date(),
          verifiedBy: adminId,
          adminNotes: adminNotes || '',
          updatedAt: new Date()
        }
      }
    );
    updateMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'updateOne' });

    if (updateResult.matchedCount === 0) {
      throw new NotFoundError('Evidence', { evidenceId });
    }

    const duration = monitor.end(true);
    logger.apiResponse('POST', '/api/evidence/verify', 200, duration, undefined, context.ip, context.requestId);
    
    return NextResponse.json({
      success: true,
      message: `Evidence ${isVerified ? 'verified' : 'rejected'} successfully`,
      evidenceId,
      isVerified,
      verifiedAt: new Date().toISOString()
    });

  } catch (error) {
    const duration = monitor.end(false);
    logger.apiResponse('POST', '/api/evidence/verify', 500, duration, error as string, context.ip, context.requestId);
    return handleApiError(error, context.requestId);
  }
}

// GET /api/evidence/verify - Auto-verify evidence using content moderation
export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('GET /api/evidence/verify');
  
  try {
    logger.apiRequest('GET', '/api/evidence/verify', undefined, context.ip, context.requestId);
    
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const querySchema = {
      evidenceId: {
        required: true,
        type: 'string' as const,
        pattern: /^[0-9a-fA-F]{24}$/,
      },
    };
    
    const validatedQuery = validateQueryParams(searchParams, querySchema);
    const { evidenceId } = validatedQuery;

    const db = await getDatabase();
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);

    // Get evidence
    const dbMonitor = new PerformanceMonitor('Database findOne');
    const evidence = await evidenceCollection.findOne({ _id: new ObjectId(evidenceId) } as any);
    dbMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'findOne' });
    
    if (!evidence) {
      throw new NotFoundError('Evidence', { evidenceId });
    }

    // Perform automated content moderation
    const moderationResult = performContentModeration(evidence);

    // Auto-verify if content passes moderation
    let autoVerified = false;
    if (moderationResult.isAppropriate && moderationResult.confidence < 0.2) {
      const updateMonitor = new PerformanceMonitor('Database updateOne');
      await evidenceCollection.updateOne(
        { _id: new ObjectId(evidenceId) } as any,
        {
          $set: {
            isVerified: true,
            verifiedAt: new Date(),
            verifiedBy: 'system',
            adminNotes: 'Auto-verified by content moderation system',
            moderationFlags: moderationResult.flags,
            moderationConfidence: moderationResult.confidence,
            updatedAt: new Date()
          }
        }
      );
      updateMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'updateOne' });
      autoVerified = true;
    }

    const duration = monitor.end(true);
    logger.apiResponse('GET', '/api/evidence/verify', 200, duration, undefined, context.ip, context.requestId);
    
    return NextResponse.json({
      success: true,
      evidenceId,
      moderation: {
        isAppropriate: moderationResult.isAppropriate,
        flags: moderationResult.flags,
        confidence: moderationResult.confidence,
        autoVerified,
        requiresManualReview: !moderationResult.isAppropriate || moderationResult.confidence >= 0.2
      }
    });

  } catch (error) {
    const duration = monitor.end(false);
    logger.apiResponse('GET', '/api/evidence/verify', 500, duration, error as string, context.ip, context.requestId);
    return handleApiError(error, context.requestId);
  }
}

// PUT /api/evidence/verify - Bulk verify evidence
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('PUT /api/evidence/verify');
  
  try {
    logger.apiRequest('PUT', '/api/evidence/verify', undefined, context.ip, context.requestId);
    
    // Validate request body
    const bulkVerificationSchema = {
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
      isVerified: {
        required: true,
        type: 'boolean' as const,
      },
      adminNotes: {
        required: false,
        type: 'string' as const,
        maxLength: 1000,
      },
    };
    
    const validatedData = await validateRequestBody(request, bulkVerificationSchema);
    const { evidenceIds, adminId, isVerified, adminNotes } = validatedData;

    if (evidenceIds.length > 100) {
      throw new ValidationError('Cannot verify more than 100 evidence items at once');
    }

    const db = await getDatabase();
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);

    // Bulk update evidence verification status
    const updateMonitor = new PerformanceMonitor('Database updateMany');
    const updateResult = await evidenceCollection.updateMany(
      { _id: { $in: evidenceIds.map((id: string) => new ObjectId(id)) } } as any,
      {
        $set: {
          isVerified,
          verifiedAt: new Date(),
          verifiedBy: adminId,
          adminNotes: adminNotes || '',
          updatedAt: new Date()
        }
      }
    );
    updateMonitor.end(true, { collection: COLLECTIONS.EVIDENCE, operation: 'updateMany' });

    const duration = monitor.end(true);
    logger.apiResponse('PUT', '/api/evidence/verify', 200, duration, undefined, context.ip, context.requestId);
    
    return NextResponse.json({
      success: true,
      message: `${updateResult.modifiedCount} evidence items ${isVerified ? 'verified' : 'rejected'} successfully`,
      modifiedCount: updateResult.modifiedCount,
      totalRequested: evidenceIds.length
    });

  } catch (error) {
    const duration = monitor.end(false);
    logger.apiResponse('PUT', '/api/evidence/verify', 500, duration, error as string, context.ip, context.requestId);
    return handleApiError(error, context.requestId);
  }
}