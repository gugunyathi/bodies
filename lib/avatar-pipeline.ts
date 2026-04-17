import { googleSearchService, type CelebrityImage } from './google-search';
import { geminiAvatarService, type ImageAnalysisResult, type AvatarGenerationOptions } from './gemini-avatar';
import { imageProcessor, type ProcessedImage } from './image-processor';
import { logger } from './logger';

interface PipelineOptions {
  searchOptions?: {
    count?: number;
    imageSize?: 'huge' | 'icon' | 'large' | 'medium' | 'small' | 'xlarge' | 'xxlarge';
    imageType?: 'clipart' | 'face' | 'lineart' | 'stock' | 'photo' | 'animated';
    safeSearch?: 'active' | 'moderate' | 'off';
    fileType?: 'jpg' | 'png' | 'gif' | 'bmp' | 'svg' | 'webp' | 'ico';
  };
  processingOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpg' | 'png' | 'webp' | 'auto';
    removeBackground?: boolean;
  };
  avatarOptions?: AvatarGenerationOptions;
  qualityThreshold?: number;
  maxProcessingTime?: number;
  saveToCloudinary?: boolean;
  saveToPublic?: boolean;
}

interface PipelineResult {
  success: boolean;
  celebrityName: string;
  originalImages: CelebrityImage[];
  analyzedImages: (CelebrityImage & { analysis: ImageAnalysisResult; score: number })[];
  processedImages: ProcessedImage[];
  bestImage?: ProcessedImage;
  avatarDescription?: string;
  avatarPrompt?: string;
  publicPaths?: string[];
  metadata: {
    searchTime: number;
    analysisTime: number;
    processingTime: number;
    totalTime: number;
    imagesFound: number;
    imagesAnalyzed: number;
    imagesProcessed: number;
    averageQuality: number;
    bestScore: number;
  };
  error?: string;
}

interface BatchPipelineResult {
  success: boolean;
  results: PipelineResult[];
  summary: {
    totalCelebrities: number;
    successfulProcessing: number;
    failedProcessing: number;
    totalImagesFound: number;
    totalImagesProcessed: number;
    totalProcessingTime: number;
    averageImagesPerCelebrity: number;
  };
  errors: string[];
}

class AvatarPipeline {
  private defaultOptions: Required<PipelineOptions> = {
    searchOptions: {
      count: 10,
      imageSize: 'large',
      imageType: 'photo',
      safeSearch: 'moderate',
      fileType: 'jpg'
    },
    processingOptions: {
      maxWidth: 800,
      maxHeight: 800,
      quality: 85,
      format: 'auto',
      removeBackground: false
    },
    avatarOptions: {
      style: 'realistic',
      background: 'solid',
      backgroundColor: '#f0f0f0',
      size: 'medium',
      format: 'png',
      quality: 90
    },
    qualityThreshold: 60,
    maxProcessingTime: 300000, // 5 minutes
    saveToCloudinary: true,
    saveToPublic: false
  };

  /**
   * Process a single celebrity through the complete avatar generation pipeline
   */
  async processCelebrity(
    celebrityName: string,
    options: PipelineOptions = {}
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    logger.info(`Starting avatar pipeline for ${celebrityName}`, {
      options: opts
    });

    try {
      // Step 1: Search for images
      const searchStartTime = Date.now();
      logger.info(`Step 1: Searching for images of ${celebrityName}`);
      
      const originalImages = await googleSearchService.searchCelebrityImages(
        celebrityName,
        opts.searchOptions
      );
      
      const searchTime = Date.now() - searchStartTime;
      
      if (originalImages.length === 0) {
        return {
          success: false,
          celebrityName,
          originalImages: [],
          analyzedImages: [],
          processedImages: [],
          metadata: {
            searchTime,
            analysisTime: 0,
            processingTime: 0,
            totalTime: Date.now() - startTime,
            imagesFound: 0,
            imagesAnalyzed: 0,
            imagesProcessed: 0,
            averageQuality: 0,
            bestScore: 0
          },
          error: 'No images found'
        };
      }

      // Filter high-quality images
      const filteredImages = googleSearchService.filterHighQualityImages(originalImages, {
        minWidth: 300,
        minHeight: 300,
        blockedDomains: ['pinterest.com', 'tumblr.com', 'reddit.com', 'facebook.com', 'instagram.com']
      });

      logger.info(`Filtered ${originalImages.length} images to ${filteredImages.length} high-quality candidates`);

      // Step 2: Analyze images with Gemini AI
      const analysisStartTime = Date.now();
      logger.info(`Step 2: Analyzing ${filteredImages.length} images with Gemini AI`);
      
      const batchAnalysis = await geminiAvatarService.batchAnalyzeImages(
        filteredImages.slice(0, Math.min(filteredImages.length, 8)).map(img => img.url),
        celebrityName
      );
      
      const analysisTime = Date.now() - analysisStartTime;
      
      // Combine analysis results with original image data
      const analyzedImages = batchAnalysis.bestImages.map(result => {
        const originalImage = filteredImages.find(img => img.url === result.url);
        return {
          ...originalImage!,
          analysis: result.analysis,
          score: result.score
        };
      }).filter(img => img.score >= opts.qualityThreshold);

      if (analyzedImages.length === 0) {
        return {
          success: false,
          celebrityName,
          originalImages,
          analyzedImages: [],
          processedImages: [],
          metadata: {
            searchTime,
            analysisTime,
            processingTime: 0,
            totalTime: Date.now() - startTime,
            imagesFound: originalImages.length,
            imagesAnalyzed: batchAnalysis.totalAnalyzed,
            imagesProcessed: 0,
            averageQuality: batchAnalysis.averageQuality,
            bestScore: 0
          },
          error: 'No images met quality threshold'
        };
      }

      // Step 3: Process and save the best images
      const processingStartTime = Date.now();
      logger.info(`Step 3: Processing top ${Math.min(analyzedImages.length, 3)} images`);
      
      const imagesToProcess = analyzedImages.slice(0, 3); // Process top 3
      const processedImages: ProcessedImage[] = [];
      const publicPaths: string[] = [];
      
      for (let i = 0; i < imagesToProcess.length; i++) {
        const image = imagesToProcess[i];
        const publicId = `${celebrityName.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`;
        
        try {
          if (opts.saveToCloudinary) {
            const processed = await imageProcessor.processAndUploadImage(
              image.url,
              publicId,
              opts.processingOptions
            );
            
            if (processed) {
              processedImages.push(processed);
            }
          }
          
          if (opts.saveToPublic) {
            const filename = imageProcessor.generateCelebrityFilename(celebrityName, i);
            const localPath = await imageProcessor.saveImageToPublic(
              image.url,
              filename,
              opts.processingOptions
            );
            
            if (localPath) {
              publicPaths.push(localPath);
            }
          }
          
          // Add delay between processing
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (error) {
          logger.error(`Failed to process image ${i + 1} for ${celebrityName}`, error instanceof Error ? error : new Error(String(error)), {
            imageUrl: image.url
          });
        }
      }
      
      const processingTime = Date.now() - processingStartTime;

      // Step 4: Generate avatar description and prompt
      logger.info(`Step 4: Generating avatar description for ${celebrityName}`);
      
      let avatarDescription: string | undefined;
      let avatarPrompt: string | undefined;
      
      try {
        const bestImageUrl = analyzedImages[0].url;
        
        [avatarDescription, avatarPrompt] = await Promise.all([
          geminiAvatarService.enhanceImageDescription(bestImageUrl, celebrityName),
          geminiAvatarService.generateAvatarPrompt(
            celebrityName,
            analyzedImages.slice(0, 2).map(img => img.url),
            opts.avatarOptions.style || 'realistic'
          )
        ]);
        
      } catch (error) {
        logger.error(`Failed to generate avatar content for ${celebrityName}`, error instanceof Error ? error : new Error(String(error)));
      }

      const totalTime = Date.now() - startTime;
      
      const result: PipelineResult = {
        success: true,
        celebrityName,
        originalImages,
        analyzedImages,
        processedImages,
        bestImage: processedImages[0],
        avatarDescription,
        avatarPrompt,
        publicPaths: publicPaths.length > 0 ? publicPaths : undefined,
        metadata: {
          searchTime,
          analysisTime,
          processingTime,
          totalTime,
          imagesFound: originalImages.length,
          imagesAnalyzed: batchAnalysis.totalAnalyzed,
          imagesProcessed: processedImages.length + publicPaths.length,
          averageQuality: batchAnalysis.averageQuality,
          bestScore: analyzedImages[0]?.score || 0
        }
      };

      logger.info(`Avatar pipeline completed for ${celebrityName}`, {
        success: true,
        totalTime,
        imagesProcessed: result.metadata.imagesProcessed,
        bestScore: result.metadata.bestScore
      });

      return result;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      logger.error(`Avatar pipeline failed for ${celebrityName}`, error instanceof Error ? error : new Error(String(error)), {
        totalTime
      });

      return {
        success: false,
        celebrityName,
        originalImages: [],
        analyzedImages: [],
        processedImages: [],
        metadata: {
          searchTime: 0,
          analysisTime: 0,
          processingTime: 0,
          totalTime,
          imagesFound: 0,
          imagesAnalyzed: 0,
          imagesProcessed: 0,
          averageQuality: 0,
          bestScore: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process multiple celebrities in batch
   */
  async processBatch(
    celebrityNames: string[],
    options: PipelineOptions = {},
    delayBetweenCelebrities: number = 5000
  ): Promise<BatchPipelineResult> {
    const startTime = Date.now();
    
    logger.info(`Starting batch avatar pipeline for ${celebrityNames.length} celebrities`, {
      celebrities: celebrityNames,
      delayBetweenCelebrities
    });

    const results: PipelineResult[] = [];
    const errors: string[] = [];

    for (const celebrityName of celebrityNames) {
      try {
        const result = await this.processCelebrity(celebrityName, options);
        results.push(result);
        
        if (!result.success && result.error) {
          errors.push(`${celebrityName}: ${result.error}`);
        }
        
        // Add delay between celebrities to respect rate limits
        if (delayBetweenCelebrities > 0 && celebrityNames.indexOf(celebrityName) < celebrityNames.length - 1) {
          logger.info(`Waiting ${delayBetweenCelebrities}ms before processing next celebrity`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenCelebrities));
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${celebrityName}: ${errorMessage}`);
        
        logger.error(`Failed to process celebrity in batch: ${celebrityName}`, error instanceof Error ? error : new Error(String(error)));
        
        // Add a failed result
        results.push({
          success: false,
          celebrityName,
          originalImages: [],
          analyzedImages: [],
          processedImages: [],
          metadata: {
            searchTime: 0,
            analysisTime: 0,
            processingTime: 0,
            totalTime: 0,
            imagesFound: 0,
            imagesAnalyzed: 0,
            imagesProcessed: 0,
            averageQuality: 0,
            bestScore: 0
          },
          error: errorMessage
        });
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    const successfulResults = results.filter(r => r.success);
    const totalImagesFound = results.reduce((sum, r) => sum + r.metadata.imagesFound, 0);
    const totalImagesProcessed = results.reduce((sum, r) => sum + r.metadata.imagesProcessed, 0);

    const batchResult: BatchPipelineResult = {
      success: successfulResults.length > 0,
      results,
      summary: {
        totalCelebrities: celebrityNames.length,
        successfulProcessing: successfulResults.length,
        failedProcessing: results.length - successfulResults.length,
        totalImagesFound,
        totalImagesProcessed,
        totalProcessingTime,
        averageImagesPerCelebrity: celebrityNames.length > 0 ? totalImagesProcessed / celebrityNames.length : 0
      },
      errors
    };

    logger.info(`Batch avatar pipeline completed`, {
      totalCelebrities: celebrityNames.length,
      successful: successfulResults.length,
      failed: batchResult.summary.failedProcessing,
      totalProcessingTime,
      totalImagesProcessed
    });

    return batchResult;
  }

  /**
   * Get existing celebrity profiles and update missing images
   */
  async updateExistingProfiles(
    existingCelebrities: string[],
    options: PipelineOptions = {}
  ): Promise<BatchPipelineResult> {
    logger.info(`Updating existing celebrity profiles`, {
      count: existingCelebrities.length
    });

    // Filter out celebrities that already have good images
    const celebritiesToUpdate = existingCelebrities.filter(name => {
      // Add logic here to check if celebrity already has good images
      // For now, process all
      return true;
    });

    return this.processBatch(celebritiesToUpdate, {
      ...options,
      saveToPublic: true, // Save to public directory for existing profiles
      processingOptions: {
        ...options.processingOptions,
        maxWidth: 600,
        maxHeight: 600,
        quality: 90
      }
    });
  }
}

export const avatarPipeline = new AvatarPipeline();
export type { PipelineOptions, PipelineResult, BatchPipelineResult };