import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';

interface AvatarGenerationOptions {
  style?: 'realistic' | 'cartoon' | 'anime' | 'artistic' | 'minimalist';
  background?: 'transparent' | 'solid' | 'gradient' | 'blur';
  backgroundColor?: string;
  size?: 'small' | 'medium' | 'large';
  format?: 'png' | 'jpg' | 'webp';
  quality?: number;
}

interface ImageAnalysisResult {
  isPersonDetected: boolean;
  faceCount: number;
  imageQuality: 'low' | 'medium' | 'high';
  dominantColors: string[];
  description: string;
  suitableForAvatar: boolean;
  confidence: number;
  suggestedCrops?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

interface AvatarGenerationResult {
  success: boolean;
  avatarUrl?: string;
  thumbnailUrl?: string;
  metadata?: {
    style: string;
    size: string;
    format: string;
    generatedAt: string;
  };
  error?: string;
}

class GeminiAvatarService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Analyze an image to determine if it's suitable for avatar creation
   */
  async analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
    try {
      logger.info(`Analyzing image for avatar suitability: ${imageUrl}`);

      // Download image data
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      const prompt = `
Analyze this image and provide a detailed assessment for avatar creation. Please respond in JSON format with the following structure:
{
  "isPersonDetected": boolean,
  "faceCount": number,
  "imageQuality": "low" | "medium" | "high",
  "dominantColors": ["color1", "color2", "color3"],
  "description": "detailed description of the image",
  "suitableForAvatar": boolean,
  "confidence": number (0-1),
  "suggestedCrops": [{"x": number, "y": number, "width": number, "height": number}]
}

Consider the following criteria:
- Is there a clear, well-lit human face?
- Is the person the main subject of the image?
- Is the image quality high enough for avatar creation?
- Are there any obstructions or distracting elements?
- Would this make a good profile picture?
`;

      const result = await this.model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        prompt
      ]);

      const response_text = result.response.text();
      
      // Parse JSON response
      let analysisResult: ImageAnalysisResult;
      try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = response_text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        analysisResult = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        logger.error('Failed to parse Gemini response as JSON', parseError instanceof Error ? parseError : new Error(String(parseError)), {
          response: response_text
        });
        
        // Fallback analysis
        analysisResult = {
          isPersonDetected: response_text.toLowerCase().includes('person') || response_text.toLowerCase().includes('face'),
          faceCount: response_text.toLowerCase().includes('face') ? 1 : 0,
          imageQuality: 'medium',
          dominantColors: [],
          description: response_text,
          suitableForAvatar: response_text.toLowerCase().includes('suitable') || response_text.toLowerCase().includes('good'),
          confidence: 0.5
        };
      }

      logger.info(`Image analysis completed`, {
        imageUrl,
        suitableForAvatar: analysisResult.suitableForAvatar,
        confidence: analysisResult.confidence
      });

      return analysisResult;

    } catch (error) {
      logger.error(`Error analyzing image: ${imageUrl}`, error instanceof Error ? error : new Error(String(error)), {
        imageUrl
      });
      
      // Return default analysis on error
      return {
        isPersonDetected: false,
        faceCount: 0,
        imageQuality: 'low',
        dominantColors: [],
        description: 'Analysis failed',
        suitableForAvatar: false,
        confidence: 0
      };
    }
  }

  /**
   * Generate avatar description based on celebrity name and reference images
   */
  async generateAvatarPrompt(
    celebrityName: string,
    referenceImages: string[],
    style: string = 'realistic'
  ): Promise<string> {
    try {
      logger.info(`Generating avatar prompt for ${celebrityName}`);

      const prompt = `
Create a detailed prompt for generating a high-quality avatar of ${celebrityName} in ${style} style.

The prompt should include:
1. Physical characteristics and distinctive features
2. Facial structure and expressions
3. Hair style and color
4. Clothing/styling preferences
5. Overall aesthetic and mood

Style requirements:
- ${style} art style
- Professional headshot composition
- Clean background
- High quality and detailed
- Suitable for use as a profile picture

Please provide a comprehensive prompt that would help an AI image generator create an accurate and appealing avatar.
`;

      const result = await this.model.generateContent(prompt);
      const avatarPrompt = result.response.text();

      logger.info(`Generated avatar prompt for ${celebrityName}`, {
        promptLength: avatarPrompt.length,
        style
      });

      return avatarPrompt;

    } catch (error) {
      logger.error(`Error generating avatar prompt for ${celebrityName}`, error instanceof Error ? error : new Error(String(error)), {
        celebrityName,
        style
      });
      
      // Return fallback prompt
      return `Create a ${style} style avatar of ${celebrityName}, professional headshot, clean background, high quality`;
    }
  }

  /**
   * Enhance image description for better avatar generation
   */
  async enhanceImageDescription(imageUrl: string, celebrityName: string): Promise<string> {
    try {
      logger.info(`Enhancing image description for ${celebrityName}`);

      // Download image data
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      const prompt = `
Analyze this image of ${celebrityName} and provide a detailed description that would be useful for creating an avatar or profile picture.

Focus on:
1. Facial features and expressions
2. Hair style, color, and texture
3. Skin tone and complexion
4. Eye color and shape
5. Distinctive characteristics
6. Clothing and styling visible in the image
7. Lighting and photo quality
8. Overall mood and aesthetic

Provide a comprehensive description that captures the essence of this person's appearance in this particular image.
`;

      const result = await this.model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        prompt
      ]);

      const description = result.response.text();

      logger.info(`Enhanced image description for ${celebrityName}`, {
        descriptionLength: description.length
      });

      return description;

    } catch (error) {
      logger.error(`Error enhancing image description for ${celebrityName}`, error instanceof Error ? error : new Error(String(error)), {
        celebrityName
      });
      
      return `Professional photo of ${celebrityName}`;
    }
  }

  /**
   * Batch analyze multiple images for a celebrity
   */
  async batchAnalyzeImages(
    imageUrls: string[],
    celebrityName: string
  ): Promise<{
    bestImages: { url: string; analysis: ImageAnalysisResult; score: number }[];
    totalAnalyzed: number;
    averageQuality: number;
  }> {
    logger.info(`Starting batch analysis of ${imageUrls.length} images for ${celebrityName}`);

    const results: { url: string; analysis: ImageAnalysisResult; score: number }[] = [];
    let totalQualityScore = 0;

    for (const imageUrl of imageUrls) {
      try {
        const analysis = await this.analyzeImage(imageUrl);
        
        // Calculate composite score
        const score = this.calculateImageScore(analysis);
        
        results.push({
          url: imageUrl,
          analysis,
          score
        });

        totalQualityScore += score;

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error(`Failed to analyze image: ${imageUrl}`, error instanceof Error ? error : new Error(String(error)), {
          imageUrl
        });
      }
    }

    // Sort by score (best first)
    results.sort((a, b) => b.score - a.score);

    const averageQuality = results.length > 0 ? totalQualityScore / results.length : 0;

    logger.info(`Completed batch analysis for ${celebrityName}`, {
      totalAnalyzed: results.length,
      averageQuality,
      bestScore: results[0]?.score || 0
    });

    return {
      bestImages: results,
      totalAnalyzed: results.length,
      averageQuality
    };
  }

  /**
   * Calculate a composite score for image quality and avatar suitability
   */
  private calculateImageScore(analysis: ImageAnalysisResult): number {
    let score = 0;

    // Base score from confidence
    score += analysis.confidence * 40;

    // Bonus for person detection
    if (analysis.isPersonDetected) score += 20;

    // Bonus for single face (ideal for avatar)
    if (analysis.faceCount === 1) {
      score += 20;
    } else if (analysis.faceCount > 1) {
      score += 5; // Some points but not ideal
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

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Generate text-based avatar description (for use with other AI image generators)
   */
  async generateTextAvatar(
    celebrityName: string,
    options: AvatarGenerationOptions = {}
  ): Promise<AvatarGenerationResult> {
    try {
      const {
        style = 'realistic',
        background = 'solid',
        backgroundColor = '#f0f0f0',
        size = 'medium'
      } = options;

      logger.info(`Generating text avatar description for ${celebrityName}`);

      const prompt = `
Create a detailed text description for generating a ${style} style avatar of ${celebrityName}.

Specifications:
- Style: ${style}
- Background: ${background} ${background === 'solid' ? backgroundColor : ''}
- Size: ${size}
- Format: Professional headshot/portrait
- Quality: High resolution, detailed

The description should be comprehensive enough for an AI image generator to create an accurate and appealing avatar. Include physical characteristics, styling, mood, and technical specifications.

Provide the description in a format suitable for AI image generation prompts.
`;

      const result = await this.model.generateContent(prompt);
      const description = result.response.text();

      const avatarResult: AvatarGenerationResult = {
        success: true,
        avatarUrl: description, // In this case, we return the text description
        metadata: {
          style,
          size,
          format: 'text-description',
          generatedAt: new Date().toISOString()
        }
      };

      logger.info(`Generated text avatar for ${celebrityName}`, {
        style,
        descriptionLength: description.length
      });

      return avatarResult;

    } catch (error) {
      logger.error(`Error generating text avatar for ${celebrityName}`, error instanceof Error ? error : new Error(String(error)), {
        celebrityName
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const geminiAvatarService = new GeminiAvatarService();
export type {
  AvatarGenerationOptions,
  ImageAnalysisResult,
  AvatarGenerationResult
};