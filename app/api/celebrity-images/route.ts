import { NextRequest, NextResponse } from 'next/server';
import { googleSearchService } from '@/lib/google-search';
import { geminiAvatarService } from '@/lib/gemini-avatar';
import { imageProcessor } from '@/lib/image-processor';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/security';

interface CelebrityImageRequest {
  celebrityName: string;
  count?: number;
  generateAvatar?: boolean;
  saveToPublic?: boolean;
  imageOptions?: {
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
}

interface CelebrityImageResponse {
  success: boolean;
  celebrityName: string;
  images: {
    original: {
      url: string;
      title: string;
      source: string;
      analysis?: any;
    }[];
    processed: {
      url: string;
      publicId: string;
      thumbnailUrl?: string;
      localPath?: string;
    }[];
    avatar?: {
      description: string;
      prompt: string;
      style: string;
    };
  };
  metadata: {
    totalFound: number;
    totalProcessed: number;
    processingTime: number;
    timestamp: string;
  };
  error?: string;
}

// Rate limiting: using security module

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error || 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body: CelebrityImageRequest = await request.json();
    const {
      celebrityName,
      count = 5,
      generateAvatar = false,
      saveToPublic = false,
      imageOptions = {},
      processingOptions = {}
    } = body;

    if (!celebrityName || typeof celebrityName !== 'string') {
      return NextResponse.json(
        { error: 'Celebrity name is required and must be a string' },
        { status: 400 }
      );
    }

    logger.info(`Starting celebrity image extraction`, {
      celebrityName,
      count,
      generateAvatar,
      saveToPublic
    });

    // Step 1: Search for celebrity images
    const searchResults = await googleSearchService.searchCelebrityImages(
      celebrityName,
      {
        count: Math.min(count, 10), // Limit to 10 per request
        imageSize: imageOptions.imageSize || 'large',
        imageType: imageOptions.imageType || 'photo',
        safeSearch: imageOptions.safeSearch || 'moderate',
        fileType: imageOptions.fileType || 'jpg'
      }
    );

    if (searchResults.length === 0) {
      return NextResponse.json({
        success: false,
        celebrityName,
        images: { original: [], processed: [] },
        metadata: {
          totalFound: 0,
          totalProcessed: 0,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        },
        error: 'No images found for the specified celebrity'
      } as CelebrityImageResponse);
    }

    // Step 2: Filter high-quality images
    const filteredImages = googleSearchService.filterHighQualityImages(searchResults, {
      minWidth: 300,
      minHeight: 300,
      blockedDomains: ['pinterest.com', 'tumblr.com', 'reddit.com', 'facebook.com']
    });

    logger.info(`Filtered images`, {
      celebrityName,
      originalCount: searchResults.length,
      filteredCount: filteredImages.length
    });

    // Step 3: Analyze images with Gemini AI
    const analyzedImages = [];
    for (const image of filteredImages.slice(0, count)) {
      try {
        const analysis = await geminiAvatarService.analyzeImage(image.url);
        analyzedImages.push({
          ...image,
          analysis
        });
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Failed to analyze image: ${image.url}`, error instanceof Error ? error : new Error(String(error)));
        analyzedImages.push({
          ...image,
          analysis: null
        });
      }
    }

    // Step 4: Sort by quality score and select best images
    const scoredImages = analyzedImages
      .filter(img => img.analysis)
      .map(img => ({
        ...img,
        score: calculateImageScore(img.analysis)
      }))
      .sort((a, b) => b.score - a.score);

    const bestImages = scoredImages.slice(0, Math.min(count, 3)); // Process top 3

    // Step 5: Process and save images
    const processedImages = [];
    for (let i = 0; i < bestImages.length; i++) {
      const image = bestImages[i];
      try {
        const publicId = `${celebrityName.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`;
        
        if (saveToPublic) {
          // Save to public directory
          const filename = imageProcessor.generateCelebrityFilename(celebrityName, i);
          const localPath = await imageProcessor.saveImageToPublic(
            image.url,
            filename,
            processingOptions
          );
          
          if (localPath) {
            processedImages.push({
              url: image.url,
              publicId,
              localPath,
              thumbnailUrl: localPath // For local files, use same path
            });
          }
        } else {
          // Upload to Cloudinary
          const processed = await imageProcessor.processAndUploadImage(
            image.url,
            publicId,
            {
              maxWidth: processingOptions.maxWidth || 800,
              maxHeight: processingOptions.maxHeight || 800,
              quality: processingOptions.quality || 80,
              format: processingOptions.format || 'auto',
              removeBackground: processingOptions.removeBackground || false
            }
          );
          
          if (processed) {
            processedImages.push({
              url: processed.url,
              publicId: processed.publicId,
              thumbnailUrl: processed.thumbnailUrl
            });
          }
        }
        
        // Add delay between processing
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(`Failed to process image for ${celebrityName}`, error instanceof Error ? error : new Error(String(error)), {
          imageUrl: image.url
        });
      }
    }

    // Step 6: Generate avatar description if requested
    let avatarData;
    if (generateAvatar && bestImages.length > 0) {
      try {
        const avatarPrompt = await geminiAvatarService.generateAvatarPrompt(
          celebrityName,
          bestImages.slice(0, 2).map(img => img.url),
          'realistic'
        );
        
        const enhancedDescription = await geminiAvatarService.enhanceImageDescription(
          bestImages[0].url,
          celebrityName
        );
        
        avatarData = {
          description: enhancedDescription,
          prompt: avatarPrompt,
          style: 'realistic'
        };
      } catch (error) {
        logger.error(`Failed to generate avatar for ${celebrityName}`, error instanceof Error ? error : new Error(String(error)));
      }
    }

    const response: CelebrityImageResponse = {
      success: true,
      celebrityName,
      images: {
        original: analyzedImages.map(img => ({
          url: img.url,
          title: img.title,
          source: img.source,
          analysis: img.analysis
        })),
        processed: processedImages,
        avatar: avatarData
      },
      metadata: {
        totalFound: searchResults.length,
        totalProcessed: processedImages.length,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };

    logger.info(`Celebrity image extraction completed`, {
      celebrityName,
      totalFound: searchResults.length,
      totalProcessed: processedImages.length,
      processingTime: response.metadata.processingTime
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Celebrity image extraction failed', error instanceof Error ? error : new Error(String(error)));

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        metadata: {
          totalFound: 0,
          totalProcessed: 0,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      } as Partial<CelebrityImageResponse>,
      { status: 500 }
    );
  }
}

// GET endpoint for batch processing multiple celebrities
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error || 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const celebritiesParam = searchParams.get('celebrities');
    const count = parseInt(searchParams.get('count') || '3');
    const generateAvatar = searchParams.get('generateAvatar') === 'true';
    
    if (!celebritiesParam) {
      return NextResponse.json(
        { error: 'celebrities parameter is required (comma-separated list)' },
        { status: 400 }
      );
    }

    const celebrities = celebritiesParam.split(',').map(name => name.trim()).filter(Boolean);
    
    if (celebrities.length === 0 || celebrities.length > 5) {
      return NextResponse.json(
        { error: 'Please provide 1-5 celebrity names' },
        { status: 400 }
      );
    }

    logger.info(`Starting batch celebrity image extraction`, {
      celebrities,
      count,
      generateAvatar
    });

    const results = [];
    
    for (const celebrityName of celebrities) {
      try {
        // Create a mock request for the POST handler
        const mockRequest = {
          json: async () => ({
            celebrityName,
            count,
            generateAvatar,
            saveToPublic: true // For batch processing, save locally
          })
        } as NextRequest;
        
        const response = await POST(mockRequest);
        const data = await response.json();
        results.push(data);
        
        // Add delay between celebrities
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        logger.error(`Failed to process celebrity: ${celebrityName}`, error instanceof Error ? error : new Error(String(error)));
        results.push({
          success: false,
          celebrityName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: celebrities.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Batch celebrity image extraction failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate a composite score for image quality and avatar suitability
 */
function calculateImageScore(analysis: any): number {
  if (!analysis) return 0;
  
  let score = 0;
  
  // Base score from confidence
  score += (analysis.confidence || 0) * 40;
  
  // Bonus for person detection
  if (analysis.isPersonDetected) score += 20;
  
  // Bonus for single face (ideal for avatar)
  if (analysis.faceCount === 1) {
    score += 20;
  } else if (analysis.faceCount > 1) {
    score += 5;
  }
  
  // Quality bonus
  switch (analysis.imageQuality) {
    case 'high':
      score += 15;
      break;
    case 'medium':
      score += 10;
      break;
    case 'low':
      score += 0;
      break;
  }
  
  // Avatar suitability bonus
  if (analysis.suitableForAvatar) score += 15;
  
  return Math.min(score, 100);
}