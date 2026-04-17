import { logger } from './logger';

interface GoogleSearchResult {
  title: string;
  link: string;
  displayLink: string;
  snippet: string;
  htmlTitle: string;
  htmlSnippet: string;
  cacheId?: string;
  formattedUrl: string;
  htmlFormattedUrl: string;
  pagemap?: {
    cse_thumbnail?: Array<{
      src: string;
      width: string;
      height: string;
    }>;
    cse_image?: Array<{
      src: string;
    }>;
  };
}

interface GoogleSearchResponse {
  kind: string;
  url: {
    type: string;
    template: string;
  };
  queries: {
    request: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
      inputEncoding: string;
      outputEncoding: string;
      safe: string;
      cx: string;
    }>;
  };
  context: {
    title: string;
  };
  searchInformation: {
    searchTime: number;
    formattedSearchTime: string;
    totalResults: string;
    formattedTotalResults: string;
  };
  items?: GoogleSearchResult[];
}

interface CelebrityImage {
  url: string;
  title: string;
  source: string;
  thumbnail?: string;
  width?: number;
  height?: number;
}

class GoogleSearchService {
  private apiKey: string;
  private searchEngineId: string;
  private baseUrl = 'https://www.googleapis.com/customsearch/v1';

  constructor() {
    this.apiKey = process.env.GOOGLE_SEARCH_API_KEY || '';
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
    
    if (!this.apiKey) {
      throw new Error('GOOGLE_SEARCH_API_KEY environment variable is required');
    }
    if (!this.searchEngineId) {
      throw new Error('GOOGLE_SEARCH_ENGINE_ID environment variable is required');
    }
  }

  /**
   * Search for celebrity images using Google Custom Search API
   */
  async searchCelebrityImages(
    celebrityName: string,
    options: {
      count?: number;
      imageSize?: 'huge' | 'icon' | 'large' | 'medium' | 'small' | 'xlarge' | 'xxlarge';
      imageType?: 'clipart' | 'face' | 'lineart' | 'stock' | 'photo' | 'animated';
      safeSearch?: 'active' | 'moderate' | 'off';
      fileType?: 'jpg' | 'png' | 'gif' | 'bmp' | 'svg' | 'webp' | 'ico';
    } = {}
  ): Promise<CelebrityImage[]> {
    try {
      const {
        count = 10,
        imageSize = 'large',
        imageType = 'photo',
        safeSearch = 'moderate',
        fileType = 'jpg'
      } = options;

      // Construct search query with celebrity name and additional terms for better results
      const searchQuery = `${celebrityName} celebrity portrait high quality`;
      
      const params = new URLSearchParams({
        key: this.apiKey,
        cx: this.searchEngineId,
        q: searchQuery,
        searchType: 'image',
        num: Math.min(count, 10).toString(), // Google API max is 10 per request
        imgSize: imageSize,
        imgType: imageType,
        safe: safeSearch,
        fileType: fileType,
        rights: 'cc_publicdomain,cc_attribute,cc_sharealike,cc_noncommercial,cc_nonderived'
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      
      logger.info(`Searching for images of ${celebrityName}`, {
        query: searchQuery,
        count,
        imageSize,
        imageType
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bodies-App/1.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Search API error: ${response.status} - ${errorText}`);
      }

      const data: GoogleSearchResponse = await response.json();
      
      if (!data.items || data.items.length === 0) {
        logger.warn(`No images found for celebrity: ${celebrityName}`);
        return [];
      }

      // Transform Google Search results to our CelebrityImage format
      const images: CelebrityImage[] = data.items.map((item) => {
        const thumbnail = item.pagemap?.cse_thumbnail?.[0]?.src;
        const imageUrl = item.pagemap?.cse_image?.[0]?.src || item.link;
        
        return {
          url: imageUrl,
          title: item.title,
          source: item.displayLink,
          thumbnail: thumbnail,
          width: item.pagemap?.cse_thumbnail?.[0]?.width ? parseInt(item.pagemap.cse_thumbnail[0].width) : undefined,
          height: item.pagemap?.cse_thumbnail?.[0]?.height ? parseInt(item.pagemap.cse_thumbnail[0].height) : undefined
        };
      });

      logger.info(`Found ${images.length} images for ${celebrityName}`);
      return images;

    } catch (error) {
      logger.error(`Error searching for celebrity images: ${celebrityName}`, error instanceof Error ? error : new Error(String(error)), {
        celebrityName
      });
      throw error;
    }
  }

  /**
   * Search for multiple celebrities in batch
   */
  async batchSearchCelebrityImages(
    celebrityNames: string[],
    options: {
      count?: number;
      imageSize?: 'huge' | 'icon' | 'large' | 'medium' | 'small' | 'xlarge' | 'xxlarge';
      imageType?: 'clipart' | 'face' | 'lineart' | 'stock' | 'photo' | 'animated';
      safeSearch?: 'active' | 'moderate' | 'off';
      fileType?: 'jpg' | 'png' | 'gif' | 'bmp' | 'svg' | 'webp' | 'ico';
      delayMs?: number;
    } = {}
  ): Promise<Record<string, CelebrityImage[]>> {
    const { delayMs = 1000, ...searchOptions } = options;
    const results: Record<string, CelebrityImage[]> = {};

    logger.info(`Starting batch search for ${celebrityNames.length} celebrities`);

    for (const celebrityName of celebrityNames) {
      try {
        results[celebrityName] = await this.searchCelebrityImages(celebrityName, searchOptions);
        
        // Add delay between requests to respect rate limits
        if (delayMs > 0 && celebrityNames.indexOf(celebrityName) < celebrityNames.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        logger.error(`Failed to search images for ${celebrityName}`, error instanceof Error ? error : new Error(String(error)), {
          celebrityName
        });
        results[celebrityName] = [];
      }
    }

    logger.info(`Completed batch search for ${celebrityNames.length} celebrities`);
    return results;
  }

  /**
   * Validate if an image URL is accessible and returns image metadata
   */
  async validateImageUrl(imageUrl: string): Promise<{
    isValid: boolean;
    contentType?: string;
    contentLength?: number;
    width?: number;
    height?: number;
  }> {
    try {
      const response = await fetch(imageUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Bodies-App/1.0'
        }
      });

      if (!response.ok) {
        return { isValid: false };
      }

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      // Check if it's actually an image
      if (!contentType || !contentType.startsWith('image/')) {
        return { isValid: false };
      }

      return {
        isValid: true,
        contentType,
        contentLength: contentLength ? parseInt(contentLength) : undefined
      };
    } catch (error) {
      logger.error(`Error validating image URL: ${imageUrl}`, error instanceof Error ? error : new Error(String(error)), {
        imageUrl
      });
      return { isValid: false };
    }
  }

  /**
   * Filter images by quality criteria
   */
  filterHighQualityImages(
    images: CelebrityImage[],
    criteria: {
      minWidth?: number;
      minHeight?: number;
      maxFileSize?: number;
      allowedDomains?: string[];
      blockedDomains?: string[];
    } = {}
  ): CelebrityImage[] {
    const {
      minWidth = 300,
      minHeight = 300,
      allowedDomains = [],
      blockedDomains = ['pinterest.com', 'tumblr.com', 'reddit.com']
    } = criteria;

    return images.filter(image => {
      // Check dimensions if available
      if (image.width && image.width < minWidth) return false;
      if (image.height && image.height < minHeight) return false;

      // Check domain restrictions
      try {
        const url = new URL(image.url);
        const domain = url.hostname.toLowerCase();

        if (blockedDomains.some(blocked => domain.includes(blocked))) {
          return false;
        }

        if (allowedDomains.length > 0 && !allowedDomains.some(allowed => domain.includes(allowed))) {
          return false;
        }
      } catch (error) {
        // Invalid URL
        return false;
      }

      return true;
    });
  }
}

export const googleSearchService = new GoogleSearchService();
export type { CelebrityImage, GoogleSearchResult, GoogleSearchResponse };