import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';
import { Evidence, COLLECTIONS } from '../../../../lib/models';
import { validateQueryParams } from '../../../../lib/validation';
import { createRequestContext } from '../../../../lib/request-context';
import { PerformanceMonitor } from '../../../../lib/logger';
import { logger } from '../../../../lib/logger';
import { ValidationError } from '../../../../lib/errors';

interface EvidenceAnalytics {
  totalEvidence: number;
  evidenceByType: {
    image: number;
    video: number;
    link: number;
  };
  evidenceByStatus: {
    verified: number;
    pending: number;
    flagged: number;
    rejected: number;
  };
  verificationRate: number;
  flagRate: number;
  rejectionRate: number;
  uploadTrends: {
    date: string;
    count: number;
    verified: number;
    flagged: number;
  }[];
  topUploaders: {
    uploaderId: string;
    count: number;
    verifiedCount: number;
  }[];
  averageFileSize: {
    overall: number;
    byType: {
      image: number;
      video: number;
      link: number;
    };
  };
  moderationMetrics: {
    averageVerificationTime: number; // in hours
    totalModerationActions: number;
    moderationAccuracy: number; // percentage
  };
}

// GET /api/evidence/analytics - Get evidence analytics
export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('GET /api/evidence/analytics');
  
  try {
    logger.apiRequest('GET', '/api/evidence/analytics', undefined, context.ip, context.requestId);
    
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const querySchema = {
      dateFrom: {
        required: false,
        type: 'string' as const,
        pattern: /^\d{4}-\d{2}-\d{2}$/,
      },
      dateTo: {
        required: false,
        type: 'string' as const,
        pattern: /^\d{4}-\d{2}-\d{2}$/,
      },
      uploaderId: {
        required: false,
        type: 'string' as const,
        minLength: 1,
        maxLength: 100,
      },
      ratingId: {
        required: false,
        type: 'string' as const,
        minLength: 1,
        maxLength: 100,
      },
    };
    
    const validatedQuery = validateQueryParams(searchParams, querySchema);
    const { dateFrom, dateTo, uploaderId, ratingId } = validatedQuery;

    const db = await getDatabase();
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);

    // Build base filter
    const baseFilter: any = {};
    
    if (dateFrom || dateTo) {
      baseFilter.createdAt = {};
      if (dateFrom) {
        baseFilter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        baseFilter.createdAt.$lte = endDate;
      }
    }
    
    if (uploaderId) {
      baseFilter.uploaderId = uploaderId;
    }
    
    if (ratingId) {
      baseFilter.ratingId = ratingId;
    }

    const dbMonitor = new PerformanceMonitor('Analytics aggregation');
    
    // Run aggregation pipeline for comprehensive analytics
    const analyticsResults = await evidenceCollection.aggregate([
      { $match: baseFilter },
      {
        $facet: {
          // Total counts and basic stats
          totalStats: [
            {
              $group: {
                _id: null,
                totalEvidence: { $sum: 1 },
                verifiedCount: {
                  $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
                },
                flaggedCount: {
                  $sum: { $cond: [{ $eq: ['$isFlagged', true] }, 1, 0] }
                },
                rejectedCount: {
                  $sum: { $cond: [{ $eq: ['$isRejected', true] }, 1, 0] }
                },
                pendingCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$isVerified', true] },
                          { $ne: ['$isFlagged', true] },
                          { $ne: ['$isRejected', true] }
                        ]
                      },
                      1,
                      0
                    ]
                  }
                },
                totalFileSize: { $sum: { $ifNull: ['$fileSize', 0] } }
              }
            }
          ],
          
          // Evidence by type
          byType: [
            {
              $group: {
                _id: '$type',
                count: { $sum: 1 },
                averageFileSize: { $avg: { $ifNull: ['$fileSize', 0] } }
              }
            }
          ],
          
          // Upload trends (daily)
          uploadTrends: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt'
                  }
                },
                count: { $sum: 1 },
                verified: {
                  $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
                },
                flagged: {
                  $sum: { $cond: [{ $eq: ['$isFlagged', true] }, 1, 0] }
                }
              }
            },
            { $sort: { '_id': 1 } },
            { $limit: 30 } // Last 30 days
          ],
          
          // Top uploaders
          topUploaders: [
            {
              $group: {
                _id: '$uploaderId',
                count: { $sum: 1 },
                verifiedCount: {
                  $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
                }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          
          // Moderation metrics
          moderationMetrics: [
            {
              $match: {
                $or: [
                  { verifiedAt: { $exists: true } },
                  { flaggedAt: { $exists: true } },
                  { rejectedAt: { $exists: true } }
                ]
              }
            },
            {
              $addFields: {
                moderationTime: {
                  $cond: {
                    if: { $ne: ['$verifiedAt', null] },
                    then: {
                      $divide: [
                        { $subtract: ['$verifiedAt', '$createdAt'] },
                        1000 * 60 * 60 // Convert to hours
                      ]
                    },
                    else: {
                      $cond: {
                        if: { $ne: ['$flaggedAt', null] },
                        then: {
                          $divide: [
                            { $subtract: ['$flaggedAt', '$createdAt'] },
                            1000 * 60 * 60
                          ]
                        },
                        else: {
                          $cond: {
                            if: { $ne: ['$rejectedAt', null] },
                            then: {
                              $divide: [
                                { $subtract: ['$rejectedAt', '$createdAt'] },
                                1000 * 60 * 60
                              ]
                            },
                            else: null
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            {
              $group: {
                _id: null,
                averageVerificationTime: { $avg: '$moderationTime' },
                totalModerationActions: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]).toArray();
    
    dbMonitor.end(true, { 
      collection: COLLECTIONS.EVIDENCE, 
      operation: 'analytics_aggregation'
    });

    const results = analyticsResults[0];
    
    // Process results
    const totalStats = results.totalStats[0] || {
      totalEvidence: 0,
      verifiedCount: 0,
      flaggedCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
      totalFileSize: 0
    };
    
    const byType = results.byType.reduce((acc: any, item: any) => {
      acc[item._id] = {
        count: item.count,
        averageFileSize: item.averageFileSize || 0
      };
      return acc;
    }, { image: { count: 0, averageFileSize: 0 }, video: { count: 0, averageFileSize: 0 }, link: { count: 0, averageFileSize: 0 } });
    
    const uploadTrends = results.uploadTrends.map((item: any) => ({
      date: item._id,
      count: item.count,
      verified: item.verified,
      flagged: item.flagged
    }));
    
    const topUploaders = results.topUploaders.map((item: any) => ({
      uploaderId: item._id,
      count: item.count,
      verifiedCount: item.verifiedCount
    }));
    
    const moderationMetrics = results.moderationMetrics[0] || {
      averageVerificationTime: 0,
      totalModerationActions: 0
    };
    
    // Calculate rates
    const verificationRate = totalStats.totalEvidence > 0 
      ? (totalStats.verifiedCount / totalStats.totalEvidence) * 100 
      : 0;
    
    const flagRate = totalStats.totalEvidence > 0 
      ? (totalStats.flaggedCount / totalStats.totalEvidence) * 100 
      : 0;
    
    const rejectionRate = totalStats.totalEvidence > 0 
      ? (totalStats.rejectedCount / totalStats.totalEvidence) * 100 
      : 0;
    
    const moderationAccuracy = moderationMetrics.totalModerationActions > 0
      ? ((totalStats.verifiedCount + totalStats.rejectedCount) / moderationMetrics.totalModerationActions) * 100
      : 0;
    
    const analytics: EvidenceAnalytics = {
      totalEvidence: totalStats.totalEvidence,
      evidenceByType: {
        image: byType.image.count,
        video: byType.video.count,
        link: byType.link.count
      },
      evidenceByStatus: {
        verified: totalStats.verifiedCount,
        pending: totalStats.pendingCount,
        flagged: totalStats.flaggedCount,
        rejected: totalStats.rejectedCount
      },
      verificationRate: Math.round(verificationRate * 100) / 100,
      flagRate: Math.round(flagRate * 100) / 100,
      rejectionRate: Math.round(rejectionRate * 100) / 100,
      uploadTrends,
      topUploaders,
      averageFileSize: {
        overall: totalStats.totalEvidence > 0 ? totalStats.totalFileSize / totalStats.totalEvidence : 0,
        byType: {
          image: byType.image.averageFileSize,
          video: byType.video.averageFileSize,
          link: byType.link.averageFileSize
        }
      },
      moderationMetrics: {
        averageVerificationTime: Math.round((moderationMetrics.averageVerificationTime || 0) * 100) / 100,
        totalModerationActions: moderationMetrics.totalModerationActions,
        moderationAccuracy: Math.round(moderationAccuracy * 100) / 100
      }
    };

    monitor.end(true, { 
      totalEvidence: analytics.totalEvidence,
      verificationRate: analytics.verificationRate
    });

    return NextResponse.json({
      success: true,
      analytics,
      generatedAt: new Date().toISOString(),
      filters: {
        dateFrom,
        dateTo,
        uploaderId,
        ratingId
      }
    });

  } catch (error) {
    monitor.end(false, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    if (error instanceof ValidationError) {
      logger.error('Validation error in analytics API', error, { details: error.context }, { ip: context.ip, requestId: context.requestId });
      return NextResponse.json(
        { success: false, error: error.message, details: error.context },
        { status: 400 }
      );
    }

    logger.error('Error in analytics API', error as Error, undefined, { ip: context.ip, requestId: context.requestId });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/evidence/analytics - Track evidence interaction events
export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('POST /api/evidence/analytics');
  
  try {
    logger.apiRequest('POST', '/api/evidence/analytics', undefined, context.ip, context.requestId);
    
    const body = await request.json();
    
    // Validate request body for event tracking
    const { eventType, evidenceId, userId, metadata } = body;
    
    if (!eventType || !evidenceId) {
      throw new ValidationError('Missing required fields: eventType, evidenceId');
    }
    
    const validEventTypes = ['view', 'download', 'share', 'flag', 'verify', 'reject'];
    if (!validEventTypes.includes(eventType)) {
      throw new ValidationError(`Invalid eventType. Must be one of: ${validEventTypes.join(', ')}`);
    }

    const db = await getDatabase();
    
    // Create analytics event record
    const analyticsEvent = {
      eventType,
      evidenceId,
      userId: userId || 'anonymous',
      metadata: metadata || {},
      timestamp: new Date(),
      ip: context.ip,
      userAgent: request.headers.get('user-agent') || 'unknown'
    };
    
    // Store in analytics collection (you might want to create a separate collection for this)
    const analyticsCollection = db.collection('evidence_analytics_events');
    await analyticsCollection.insertOne(analyticsEvent);
    
    // Update evidence view count if it's a view event
    if (eventType === 'view') {
      const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);
      await evidenceCollection.updateOne(
        { _id: evidenceId },
        { 
          $inc: { viewCount: 1 },
          $set: { lastViewedAt: new Date() }
        }
      );
    }

    monitor.end(true, { eventType, evidenceId });

    return NextResponse.json({
      success: true,
      message: 'Analytics event recorded successfully',
      eventId: analyticsEvent.timestamp.getTime().toString()
    });

  } catch (error) {
    monitor.end(false, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    if (error instanceof ValidationError) {
      logger.error('Validation error in analytics POST API', error, { details: error.context }, { ip: context.ip, requestId: context.requestId });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    logger.error('Error in analytics POST API', error as Error, undefined, { ip: context.ip, requestId: context.requestId });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}