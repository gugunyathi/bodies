import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';
import { Evidence, COLLECTIONS } from '../../../../lib/models';
import { validateQueryParams } from '../../../../lib/validation';
import { createRequestContext } from '../../../../lib/request-context';
import { logger, PerformanceMonitor } from '../../../../lib/logger';
import { ValidationError, NotFoundError } from '../../../../lib/errors';

// GET /api/evidence/search - Advanced evidence search with filters
export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('GET /api/evidence/search');
  
  try {
    logger.apiRequest('GET', '/api/evidence/search', undefined, context.ip, context.requestId);
    
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const querySchema = {
      q: {
        required: false,
        type: 'string' as const,
        minLength: 1,
        maxLength: 100,
      },
      type: {
        required: false,
        type: 'string' as const,
        enum: ['image', 'video', 'link'] as const,
      },
      status: {
        required: false,
        type: 'string' as const,
        enum: ['verified', 'pending', 'flagged', 'rejected'] as const,
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
      sortBy: {
        required: false,
        type: 'string' as const,
        enum: ['createdAt', '-createdAt', 'fileSize', '-fileSize', 'isVerified', '-isVerified'] as const,
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
    const { 
      q: searchQuery, 
      type, 
      status, 
      uploaderId, 
      ratingId,
      dateFrom,
      dateTo,
      sortBy = '-createdAt',
      page = 1, 
      limit = 20 
    } = validatedQuery;

    const db = await getDatabase();
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);

    // Build search filter
    const filter: any = {};

    // Text search
    if (searchQuery) {
      filter.$or = [
        { description: { $regex: searchQuery, $options: 'i' } },
        { filename: { $regex: searchQuery, $options: 'i' } },
        { mimeType: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Status filter
    if (status) {
      switch (status) {
        case 'verified':
          filter.isVerified = true;
          break;
        case 'pending':
          filter.isVerified = false;
          filter.isFlagged = { $ne: true };
          filter.isRejected = { $ne: true };
          break;
        case 'flagged':
          filter.isFlagged = true;
          break;
        case 'rejected':
          filter.isRejected = true;
          break;
      }
    }

    // User filter
    if (uploaderId) {
      filter.uploaderId = uploaderId;
    }

    // Rating filter
    if (ratingId) {
      filter.ratingId = ratingId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999); // End of day
        filter.createdAt.$lte = endDate;
      }
    }

    // Build sort object
    const sort: any = {};
    if (sortBy.startsWith('-')) {
      sort[sortBy.substring(1)] = -1;
    } else {
      sort[sortBy] = 1;
    }

    // Execute search with pagination
    const dbMonitor = new PerformanceMonitor('Database search');
    
    const [evidenceList, totalCount] = await Promise.all([
      evidenceCollection
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      evidenceCollection.countDocuments(filter)
    ]);
    
    dbMonitor.end(true, { 
      collection: COLLECTIONS.EVIDENCE, 
      operation: 'search', 
      count: evidenceList.length,
      totalCount 
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    monitor.end(true, { 
      resultsCount: evidenceList.length, 
      totalCount,
      page,
      totalPages
    });

    return NextResponse.json({
      success: true,
      evidence: evidenceList.map(evidence => ({
        _id: evidence._id,
        ratingId: evidence.ratingId,
        uploaderId: evidence.uploaderId,
        type: evidence.type,
        url: evidence.url,
        filename: evidence.filename,
        fileSize: evidence.fileSize,
        mimeType: evidence.mimeType,
        description: evidence.description,
        isVerified: evidence.isVerified,
        verifiedAt: evidence.verifiedAt,
        verifiedBy: evidence.verifiedBy,
        adminNotes: evidence.adminNotes,
        isFlagged: evidence.isFlagged,
        flaggedAt: evidence.flaggedAt,
        flaggedBy: evidence.flaggedBy,
        flagReason: evidence.flagReason,
        isRejected: evidence.isRejected,
        rejectedAt: evidence.rejectedAt,
        rejectedBy: evidence.rejectedBy,
        rejectionReason: evidence.rejectionReason,
        unflaggedAt: evidence.unflaggedAt,
        unflaggedBy: evidence.unflaggedBy,
        lastModeratedBy: evidence.lastModeratedBy,
        lastModeratedAt: evidence.lastModeratedAt,
        moderationFlags: evidence.moderationFlags,
        moderationConfidence: evidence.moderationConfidence,
        createdAt: evidence.createdAt,
        updatedAt: evidence.updatedAt
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit
      },
      filters: {
        searchQuery,
        type,
        status,
        uploaderId,
        ratingId,
        dateFrom,
        dateTo,
        sortBy
      }
    });

  } catch (error) {
    monitor.end(false, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    if (error instanceof ValidationError) {
      logger.error('Search validation failed', error, { details: (error as any).details }, { ip: context.ip, requestId: context.requestId });
      return NextResponse.json(
        { success: false, error: error.message, details: (error as any).details },
        { status: 400 }
      );
    }

    logger.error('Search failed', error as Error, {}, { ip: context.ip, requestId: context.requestId });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/evidence/search - Bulk evidence search with complex queries
export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request);
  const monitor = new PerformanceMonitor('POST /api/evidence/search');
  
  try {
    logger.apiRequest('POST', '/api/evidence/search', undefined, context.ip, context.requestId);
    
    const body = await request.json();
    
    // Validate request body
    const bodySchema = {
      filters: {
        required: true,
        type: 'object' as const,
        properties: {
          searchQuery: {
            required: false,
            type: 'string' as const,
            maxLength: 100,
          },
          types: {
            required: false,
            type: 'array' as const,
            items: {
              type: 'string' as const,
              enum: ['image', 'video', 'link'] as const,
            },
          },
          statuses: {
            required: false,
            type: 'array' as const,
            items: {
              type: 'string' as const,
              enum: ['verified', 'pending', 'flagged', 'rejected'] as const,
            },
          },
          uploaderIds: {
            required: false,
            type: 'array' as const,
            items: {
              type: 'string' as const,
              minLength: 1,
            },
          },
          ratingIds: {
            required: false,
            type: 'array' as const,
            items: {
              type: 'string' as const,
              minLength: 1,
            },
          },
          dateRange: {
            required: false,
            type: 'object' as const,
            properties: {
              from: {
                type: 'string' as const,
                pattern: /^\d{4}-\d{2}-\d{2}$/,
              },
              to: {
                type: 'string' as const,
                pattern: /^\d{4}-\d{2}-\d{2}$/,
              },
            },
          },
          fileSizeRange: {
            required: false,
            type: 'object' as const,
            properties: {
              min: {
                type: 'number' as const,
                min: 0,
              },
              max: {
                type: 'number' as const,
                min: 0,
              },
            },
          },
        },
      },
      sort: {
        required: false,
        type: 'object' as const,
        properties: {
          field: {
            type: 'string' as const,
            enum: ['createdAt', 'fileSize', 'isVerified'] as const,
          },
          direction: {
            type: 'string' as const,
            enum: ['asc', 'desc'] as const,
          },
        },
      },
      pagination: {
        required: false,
        type: 'object' as const,
        properties: {
          page: {
            type: 'number' as const,
            min: 1,
          },
          limit: {
            type: 'number' as const,
            min: 1,
            max: 100,
          },
        },
      },
    };
    
    // For now, we'll implement basic validation manually
    const { filters = {}, sort = { field: 'createdAt', direction: 'desc' }, pagination = { page: 1, limit: 20 } } = body;

    const db = await getDatabase();
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);

    // Build complex search filter
    const filter: any = {};

    // Text search
    if (filters.searchQuery) {
      filter.$or = [
        { description: { $regex: filters.searchQuery, $options: 'i' } },
        { filename: { $regex: filters.searchQuery, $options: 'i' } },
        { mimeType: { $regex: filters.searchQuery, $options: 'i' } }
      ];
    }

    // Multiple types
    if (filters.types && filters.types.length > 0) {
      filter.type = { $in: filters.types };
    }

    // Multiple statuses
    if (filters.statuses && filters.statuses.length > 0) {
      const statusConditions = [];
      
      for (const status of filters.statuses) {
        switch (status) {
          case 'verified':
            statusConditions.push({ isVerified: true });
            break;
          case 'pending':
            statusConditions.push({ 
              isVerified: false, 
              isFlagged: { $ne: true }, 
              isRejected: { $ne: true } 
            });
            break;
          case 'flagged':
            statusConditions.push({ isFlagged: true });
            break;
          case 'rejected':
            statusConditions.push({ isRejected: true });
            break;
        }
      }
      
      if (statusConditions.length > 0) {
        filter.$or = filter.$or ? [...filter.$or, ...statusConditions] : statusConditions;
      }
    }

    // Multiple uploaders
    if (filters.uploaderIds && filters.uploaderIds.length > 0) {
      filter.uploaderId = { $in: filters.uploaderIds };
    }

    // Multiple ratings
    if (filters.ratingIds && filters.ratingIds.length > 0) {
      filter.ratingId = { $in: filters.ratingIds };
    }

    // Date range
    if (filters.dateRange) {
      filter.createdAt = {};
      if (filters.dateRange.from) {
        filter.createdAt.$gte = new Date(filters.dateRange.from);
      }
      if (filters.dateRange.to) {
        const endDate = new Date(filters.dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // File size range
    if (filters.fileSizeRange) {
      filter.fileSize = {};
      if (filters.fileSizeRange.min !== undefined) {
        filter.fileSize.$gte = filters.fileSizeRange.min;
      }
      if (filters.fileSizeRange.max !== undefined) {
        filter.fileSize.$lte = filters.fileSizeRange.max;
      }
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sort.field] = sort.direction === 'desc' ? -1 : 1;

    // Execute search
    const dbMonitor = new PerformanceMonitor('Database bulk search');
    
    const [evidenceList, totalCount] = await Promise.all([
      evidenceCollection
        .find(filter)
        .sort(sortObj)
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .toArray(),
      evidenceCollection.countDocuments(filter)
    ]);
    
    dbMonitor.end(true, { 
      collection: COLLECTIONS.EVIDENCE, 
      operation: 'bulk_search', 
      count: evidenceList.length,
      totalCount 
    });

    const totalPages = Math.ceil(totalCount / pagination.limit);

    monitor.end(true, { 
      resultsCount: evidenceList.length, 
      totalCount,
      page: pagination.page,
      totalPages
    });

    return NextResponse.json({
      success: true,
      evidence: evidenceList.map(evidence => ({
        _id: evidence._id,
        ratingId: evidence.ratingId,
        uploaderId: evidence.uploaderId,
        type: evidence.type,
        url: evidence.url,
        filename: evidence.filename,
        fileSize: evidence.fileSize,
        mimeType: evidence.mimeType,
        description: evidence.description,
        isVerified: evidence.isVerified,
        verifiedAt: evidence.verifiedAt,
        verifiedBy: evidence.verifiedBy,
        adminNotes: evidence.adminNotes,
        isFlagged: evidence.isFlagged,
        flaggedAt: evidence.flaggedAt,
        flaggedBy: evidence.flaggedBy,
        flagReason: evidence.flagReason,
        isRejected: evidence.isRejected,
        rejectedAt: evidence.rejectedAt,
        rejectedBy: evidence.rejectedBy,
        rejectionReason: evidence.rejectionReason,
        unflaggedAt: evidence.unflaggedAt,
        unflaggedBy: evidence.unflaggedBy,
        lastModeratedBy: evidence.lastModeratedBy,
        lastModeratedAt: evidence.lastModeratedAt,
        moderationFlags: evidence.moderationFlags,
        moderationConfidence: evidence.moderationConfidence,
        createdAt: evidence.createdAt,
        updatedAt: evidence.updatedAt
      })),
      pagination: {
        currentPage: pagination.page,
        totalPages,
        totalCount,
        hasNextPage: pagination.page < totalPages,
        hasPrevPage: pagination.page > 1,
        limit: pagination.limit
      },
      appliedFilters: filters,
      appliedSort: sort
    });

  } catch (error) {
    monitor.end(false, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    if (error instanceof ValidationError) {
      logger.error('Search validation failed', error, { details: (error as any).details }, { ip: context.ip, requestId: context.requestId });
      return NextResponse.json(
        { success: false, error: error.message, details: (error as any).details },
        { status: 400 }
      );
    }

    logger.error('Search failed', error as Error, {}, { ip: context.ip, requestId: context.requestId });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}