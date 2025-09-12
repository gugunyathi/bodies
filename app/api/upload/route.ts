// Secure file upload API endpoint with Cloudinary integration

import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, validateCloudinaryConfig } from '@/lib/cloudinary';
import { logger } from '@/lib/logger';
import { createRequestContext } from '@/lib/request-context';
import { ValidationError, handleApiError } from '@/lib/error-handling';
import { z } from 'zod';

// Validation schema for upload metadata
const uploadMetadataSchema = z.object({
  ratingId: z.string().optional(),
  uploaderId: z.string().min(1, 'Uploader ID is required'),
  type: z.enum(['image', 'video', 'document']),
  description: z.string().max(500).optional(),
  folder: z.enum(['evidence', 'profiles']).default('evidence')
});

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  document: 5 * 1024 * 1024 // 5MB
};

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  video: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm'
  ],
  document: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

// Validate file against type constraints
function validateFileConstraints(file: File, type: 'image' | 'video' | 'document'): void {
  // Check file size
  const maxSize = MAX_FILE_SIZES[type];
  if (file.size > maxSize) {
    throw new ValidationError(`File size exceeds ${maxSize / (1024 * 1024)}MB limit for ${type} files`);
  }

  // Check MIME type
  const allowedTypes = ALLOWED_MIME_TYPES[type];
  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError(`File type ${file.type} is not allowed for ${type} uploads`);
  }

  // Additional security checks
  if (file.name.length > 255) {
    throw new ValidationError('Filename is too long (max 255 characters)');
  }

  // Check for suspicious file extensions
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.vbs', '.jar'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (suspiciousExtensions.includes(fileExtension)) {
    throw new ValidationError('File type not allowed for security reasons');
  }
}

// Extract file buffer from FormData
async function extractFileFromFormData(formData: FormData): Promise<{ file: File; metadata: any }> {
  const file = formData.get('file') as File;
  if (!file) {
    throw new ValidationError('No file provided');
  }

  // Extract metadata
  const metadataStr = formData.get('metadata') as string;
  let metadata = {};
  
  if (metadataStr) {
    try {
      metadata = JSON.parse(metadataStr);
    } catch (error) {
      throw new ValidationError('Invalid metadata JSON');
    }
  }

  return { file, metadata };
}

// POST - Upload file
export async function POST(request: NextRequest) {
  const context = createRequestContext(request);
  const startTime = Date.now();

  try {
    // Validate Cloudinary configuration
    if (!validateCloudinaryConfig()) {
      throw new Error('Cloudinary configuration is invalid');
    }

    logger.info('File upload request received', {
      requestId: context.requestId,
      userAgent: context.userAgent,
      ip: context.ip
    });

    // Parse form data
    const formData = await request.formData();
    const { file, metadata } = await extractFileFromFormData(formData);

    // Validate metadata
    const validatedMetadata = uploadMetadataSchema.parse(metadata);

    // Validate file constraints
    validateFileConstraints(file, validatedMetadata.type);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.info('Starting file upload to Cloudinary', {
      requestId: context.requestId,
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      type: validatedMetadata.type,
      folder: validatedMetadata.folder
    });

    // Upload to Cloudinary
    const uploadResult = await uploadFile(
      buffer,
      file.name,
      file.type,
      {
        folder: validatedMetadata.folder,
        tags: [
          'bodies-app',
          validatedMetadata.type,
          validatedMetadata.uploaderId,
          ...(validatedMetadata.ratingId ? [validatedMetadata.ratingId] : [])
        ],
        resource_type: validatedMetadata.type === 'document' ? 'raw' : validatedMetadata.type as 'image' | 'video'
      }
    );

    // Prepare response data
    const responseData = {
      success: true,
      data: {
        id: uploadResult.public_id,
        url: uploadResult.secure_url,
        filename: file.name,
        originalFilename: file.name,
        fileSize: uploadResult.bytes,
        mimeType: file.type,
        type: validatedMetadata.type,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        folder: uploadResult.folder,
        uploadedAt: uploadResult.created_at,
        metadata: {
          ratingId: validatedMetadata.ratingId,
          uploaderId: validatedMetadata.uploaderId,
          description: validatedMetadata.description
        }
      }
    };

    const duration = Date.now() - startTime;
    logger.info('File upload completed successfully', {
      requestId: context.requestId,
      publicId: uploadResult.public_id,
      fileSize: uploadResult.bytes,
      duration
    });

    return NextResponse.json(responseData, { status: 201 });

  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error(
      'File upload failed',
      err instanceof Error ? err : new Error(String(err)),
      { duration },
      { requestId: context.requestId }
    );

    return handleApiError(err, context.requestId);
  }
}

// GET - Get upload status/info (for polling)
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      throw new ValidationError('Public ID is required');
    }

    // This could be extended to check upload status from Cloudinary
    // For now, return basic info
    return NextResponse.json({
      success: true,
      data: {
        publicId,
        status: 'completed'
      }
    });

  } catch (err) {
    logger.error(
      'Upload status check failed',
      err instanceof Error ? err : new Error(String(err)),
      {},
      { requestId: context.requestId }
    );

    return handleApiError(err, context.requestId);
  }
}

// OPTIONS - Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}