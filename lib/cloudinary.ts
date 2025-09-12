// Cloudinary integration for file uploads

import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

interface UploadOptions {
  folder?: string;
  public_id?: string;
  transformation?: any[];
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  format?: string;
  quality?: string | number;
  width?: number;
  height?: number;
  crop?: string;
  tags?: string[];
}

interface UploadResult {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder: string;
  access_mode: string;
  original_filename: string;
}

interface CloudinaryError extends Error {
  http_code?: number;
}

// Validate file type and size
function validateFile(buffer: Buffer, mimeType: string, maxSize: number = 50 * 1024 * 1024): void {
  // Check file size (50MB default)
  if (buffer.length > maxSize) {
    throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
  }

  // Validate MIME types
  const allowedImageTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  const allowedVideoTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo', // .avi
    'video/webm'
  ];

  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`File type ${mimeType} is not allowed`);
  }
}

// Get resource type from MIME type
function getResourceType(mimeType: string): 'image' | 'video' | 'raw' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'raw';
}

// Generate optimized transformations based on file type
function getOptimizedTransformations(resourceType: 'image' | 'video', purpose: 'evidence' | 'profile' = 'evidence') {
  if (resourceType === 'image') {
    return {
      transformation: [
        {
          quality: 'auto:good',
          fetch_format: 'auto',
          width: purpose === 'profile' ? 800 : 1200,
          height: purpose === 'profile' ? 800 : 1200,
          crop: 'limit'
        }
      ]
    };
  }

  if (resourceType === 'video') {
    return {
      transformation: [
        {
          quality: 'auto:good',
          width: 1280,
          height: 720,
          crop: 'limit',
          video_codec: 'h264',
          audio_codec: 'aac'
        }
      ]
    };
  }

  return {};
}

// Upload file to Cloudinary
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    // Validate file
    validateFile(buffer, mimeType);

    const resourceType = getResourceType(mimeType);
    const optimizations = resourceType === 'raw' ? {} : getOptimizedTransformations(resourceType, options.folder === 'profiles' ? 'profile' : 'evidence');

    // Prepare upload options
    const uploadOptions = {
      resource_type: resourceType,
      folder: options.folder || 'evidence',
      public_id: options.public_id,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      tags: options.tags || ['bodies-app'],
      context: {
        original_filename: filename,
        upload_timestamp: new Date().toISOString()
      },
      ...optimizations,
      ...options
    };

    logger.info('Starting Cloudinary upload', {
      filename,
      mimeType,
      resourceType,
      folder: uploadOptions.folder,
      fileSize: buffer.length
    });

    // Upload to Cloudinary
    const result = await new Promise<UploadResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: any, result: any) => {
          if (error) {
            logger.error('Cloudinary upload failed', error);
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload failed - no result returned'));
          }
        }
      ).end(buffer);
    });

    logger.info('Cloudinary upload successful', {
      public_id: result.public_id,
      secure_url: result.secure_url,
      bytes: result.bytes,
      format: result.format
    });

    return result;

  } catch (error) {
    logger.error('File upload error', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Generate thumbnail for video
export async function generateVideoThumbnail(publicId: string): Promise<string> {
  try {
    const thumbnailUrl = cloudinary.url(publicId, {
      resource_type: 'video',
      transformation: [
        {
          width: 400,
          height: 300,
          crop: 'fill',
          quality: 'auto:good',
          format: 'jpg'
        }
      ]
    });

    return thumbnailUrl;
  } catch (error) {
    logger.error('Video thumbnail generation failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Delete file from Cloudinary
export async function deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<void> {
  try {
    logger.info('Deleting file from Cloudinary', { publicId, resourceType });

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    if (result.result !== 'ok') {
      throw new Error(`Failed to delete file: ${result.result}`);
    }

    logger.info('File deleted successfully', { publicId });
  } catch (error) {
    logger.error('File deletion failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Get optimized URL for display
export function getOptimizedUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
    crop?: string;
    resourceType?: 'image' | 'video';
  } = {}
): string {
  return cloudinary.url(publicId, {
    resource_type: options.resourceType || 'image',
    transformation: [
      {
        width: options.width || 800,
        height: options.height || 600,
        crop: options.crop || 'fill',
        quality: options.quality || 'auto:good',
        fetch_format: options.format || 'auto'
      }
    ],
    secure: true
  });
}

// Validate Cloudinary configuration
export function validateCloudinaryConfig(): boolean {
  const requiredEnvVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY', 
    'CLOUDINARY_API_SECRET'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      logger.error(`Missing required environment variable: ${envVar}`);
      return false;
    }
  }

  return true;
}

// Get file info from Cloudinary
export async function getFileInfo(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image') {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });

    return {
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at,
      url: result.secure_url
    };
  } catch (error) {
    logger.error('Failed to get file info', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export { cloudinary };
export type { UploadResult, UploadOptions };