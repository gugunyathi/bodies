import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger';
import { cloudinary } from './cloudinary';

interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpg' | 'png' | 'webp' | 'auto';
  crop?: 'fill' | 'fit' | 'scale' | 'crop';
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
  background?: string;
  removeBackground?: boolean;
}

interface ProcessedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  thumbnailUrl?: string;
}

interface DownloadResult {
  success: boolean;
  localPath?: string;
  buffer?: Buffer;
  contentType?: string;
  size?: number;
  error?: string;
}

class ImageProcessor {
  private tempDir: string;
  private publicDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'images');
    this.publicDir = path.join(process.cwd(), 'public');
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      await fs.mkdir(this.publicDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create directories', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Download image from URL
   */
  async downloadImage(imageUrl: string, filename?: string): Promise<DownloadResult> {
    try {
      logger.info(`Downloading image: ${imageUrl}`);

      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Bodies-App/1.0 (Image Processor)',
          'Accept': 'image/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const size = buffer.length;

      // Generate filename if not provided
      if (!filename) {
        const url = new URL(imageUrl);
        const extension = this.getExtensionFromContentType(contentType);
        filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;
      }

      const localPath = path.join(this.tempDir, filename);
      await fs.writeFile(localPath, buffer);

      logger.info(`Image downloaded successfully`, {
        imageUrl,
        localPath,
        size,
        contentType
      });

      return {
        success: true,
        localPath,
        buffer,
        contentType,
        size
      };

    } catch (error) {
      logger.error(`Failed to download image: ${imageUrl}`, error instanceof Error ? error : new Error(String(error)), {
        imageUrl
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process and upload image to Cloudinary
   */
  async processAndUploadImage(
    imageUrl: string,
    publicId: string,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage | null> {
    try {
      logger.info(`Processing and uploading image`, { imageUrl, publicId });

      const {
        maxWidth = 800,
        maxHeight = 800,
        quality = 80,
        format = 'auto',
        crop = 'fill',
        gravity = 'face',
        background = 'white',
        removeBackground = false
      } = options;

      // Build transformation parameters
      const transformations: any[] = [];

      // Resize transformation
      transformations.push({
        width: maxWidth,
        height: maxHeight,
        crop: crop,
        gravity: gravity,
        quality: quality,
        format: format === 'auto' ? 'auto' : format
      });

      // Background removal if requested
      if (removeBackground) {
        transformations.push({
          effect: 'background_removal'
        });
      } else if (background && background !== 'transparent') {
        transformations.push({
          background: background
        });
      }

      // Upload to Cloudinary with transformations
      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        public_id: publicId,
        folder: 'celebrities',
        transformation: transformations,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp', 'gif']
      });

      // Generate thumbnail
      const thumbnailUrl = cloudinary.url(publicId, {
        folder: 'celebrities',
        width: 150,
        height: 150,
        crop: 'fill',
        gravity: 'face',
        quality: 70,
        format: 'webp'
      });

      const processedImage: ProcessedImage = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        thumbnailUrl
      };

      logger.info(`Image processed and uploaded successfully`, {
        publicId,
        url: processedImage.url,
        dimensions: `${processedImage.width}x${processedImage.height}`,
        size: processedImage.bytes
      });

      return processedImage;

    } catch (error) {
      logger.error(`Failed to process and upload image`, error instanceof Error ? error : new Error(String(error)), {
        imageUrl,
        publicId
      });
      return null;
    }
  }

  /**
   * Save image to public directory for local serving
   */
  async saveImageToPublic(
    imageUrl: string,
    filename: string,
    options: ImageProcessingOptions = {}
  ): Promise<string | null> {
    try {
      logger.info(`Saving image to public directory`, { imageUrl, filename });

      // Download the image first
      const downloadResult = await this.downloadImage(imageUrl);
      if (!downloadResult.success || !downloadResult.buffer) {
        throw new Error(downloadResult.error || 'Failed to download image');
      }

      // For local saving, we'll use a simpler approach
      // In a production environment, you might want to use sharp or similar for processing
      const publicPath = path.join(this.publicDir, filename);
      await fs.writeFile(publicPath, downloadResult.buffer);

      logger.info(`Image saved to public directory`, {
        filename,
        publicPath,
        size: downloadResult.size
      });

      return `/${filename}`; // Return relative URL for serving

    } catch (error) {
      logger.error(`Failed to save image to public directory`, error instanceof Error ? error : new Error(String(error)), {
        imageUrl,
        filename
      });
      return null;
    }
  }

  /**
   * Batch process multiple images
   */
  async batchProcessImages(
    images: { url: string; publicId: string }[],
    options: ImageProcessingOptions = {},
    delayMs: number = 1000
  ): Promise<ProcessedImage[]> {
    logger.info(`Starting batch processing of ${images.length} images`);

    const results: ProcessedImage[] = [];

    for (const { url, publicId } of images) {
      try {
        const processed = await this.processAndUploadImage(url, publicId, options);
        if (processed) {
          results.push(processed);
        }

        // Add delay between requests to avoid overwhelming services
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

      } catch (error) {
        logger.error(`Failed to process image in batch`, error instanceof Error ? error : new Error(String(error)), {
          url,
          publicId
        });
      }
    }

    logger.info(`Completed batch processing`, {
      total: images.length,
      successful: results.length,
      failed: images.length - results.length
    });

    return results;
  }

  /**
   * Validate image URL and get metadata
   */
  async validateAndGetImageInfo(imageUrl: string): Promise<{
    isValid: boolean;
    contentType?: string;
    contentLength?: number;
    width?: number;
    height?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(imageUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Bodies-App/1.0 (Image Validator)'
        }
      });

      if (!response.ok) {
        return {
          isValid: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');

      if (!contentType || !contentType.startsWith('image/')) {
        return {
          isValid: false,
          error: `Invalid content type: ${contentType}`
        };
      }

      return {
        isValid: true,
        contentType,
        contentLength: contentLength ? parseInt(contentLength) : undefined
      };

    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(olderThanHours: number = 24): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up temporary files`, {
        totalFiles: files.length,
        deletedFiles: deletedCount,
        olderThanHours
      });

    } catch (error) {
      logger.error('Failed to cleanup temporary files', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const typeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/svg+xml': 'svg'
    };

    return typeMap[contentType.toLowerCase()] || 'jpg';
  }

  /**
   * Generate optimized filename for celebrity images
   */
  generateCelebrityFilename(celebrityName: string, index: number = 0): string {
    const sanitized = celebrityName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const suffix = index > 0 ? `-${index}` : '';
    return `${sanitized}${suffix}.png`;
  }
}

export const imageProcessor = new ImageProcessor();
export type { ImageProcessingOptions, ProcessedImage, DownloadResult };