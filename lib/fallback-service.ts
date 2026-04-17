import { logger } from './logger';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

interface LocalImageInfo {
  filename: string;
  path: string;
  celebrityName: string;
  size: number;
  lastModified: Date;
  isAvatar: boolean;
}

interface DefaultAvatarOptions {
  style: 'initials' | 'geometric' | 'abstract' | 'silhouette';
  backgroundColor: string;
  textColor: string;
  size: number;
  format: 'svg' | 'png';
}

interface CachedResult {
  celebrityName: string;
  timestamp: number;
  data: any;
  expiresAt: number;
  source: 'google_search' | 'gemini_analysis' | 'image_processing';
}

class FallbackService {
  private publicImagesPath: string;
  private cacheDir: string;
  private defaultCacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.publicImagesPath = path.join(process.cwd(), 'public', 'images', 'celebrities');
    this.cacheDir = path.join(process.cwd(), '.cache', 'celebrity-data');
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.publicImagesPath, { recursive: true });
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create fallback directories', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get local celebrity images from public directory
   */
  async getLocalCelebrityImages(celebrityName: string): Promise<LocalImageInfo[]> {
    try {
      const normalizedName = this.normalizeCelebrityName(celebrityName);
      const images: LocalImageInfo[] = [];

      if (!existsSync(this.publicImagesPath)) {
        return images;
      }

      const files = await fs.readdir(this.publicImagesPath);
      
      for (const file of files) {
        if (this.isImageFile(file) && file.toLowerCase().includes(normalizedName.toLowerCase())) {
          const filePath = path.join(this.publicImagesPath, file);
          const stats = await fs.stat(filePath);
          
          images.push({
            filename: file,
            path: filePath,
            celebrityName,
            size: stats.size,
            lastModified: stats.mtime,
            isAvatar: file.includes('avatar') || file.includes('profile')
          });
        }
      }

      logger.info(`Found ${images.length} local images for ${celebrityName}`, {
        celebrityName,
        imageCount: images.length,
        files: images.map(img => img.filename)
      });

      return images.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    } catch (error) {
      logger.error(`Failed to get local images for ${celebrityName}`, error instanceof Error ? error : new Error(String(error)), {
        celebrityName
      });
      return [];
    }
  }

  /**
   * Get all available local celebrity images
   */
  async getAllLocalCelebrities(): Promise<Record<string, LocalImageInfo[]>> {
    try {
      const celebrities: Record<string, LocalImageInfo[]> = {};

      if (!existsSync(this.publicImagesPath)) {
        return celebrities;
      }

      const files = await fs.readdir(this.publicImagesPath);
      
      for (const file of files) {
        if (this.isImageFile(file)) {
          const celebrityName = this.extractCelebrityNameFromFile(file);
          
          if (celebrityName) {
            if (!celebrities[celebrityName]) {
              celebrities[celebrityName] = [];
            }
            
            const filePath = path.join(this.publicImagesPath, file);
            const stats = await fs.stat(filePath);
            
            celebrities[celebrityName].push({
              filename: file,
              path: filePath,
              celebrityName,
              size: stats.size,
              lastModified: stats.mtime,
              isAvatar: file.includes('avatar') || file.includes('profile')
            });
          }
        }
      }

      // Sort images for each celebrity by modification date
      Object.keys(celebrities).forEach(name => {
        celebrities[name].sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      });

      logger.info(`Found local images for ${Object.keys(celebrities).length} celebrities`, {
        celebrityCount: Object.keys(celebrities).length,
        totalImages: Object.values(celebrities).reduce((sum, imgs) => sum + imgs.length, 0)
      });

      return celebrities;

    } catch (error) {
      logger.error('Failed to get all local celebrities', error instanceof Error ? error : new Error(String(error)));
      return {};
    }
  }

  /**
   * Generate a default avatar when no images are available
   */
  generateDefaultAvatar(
    celebrityName: string,
    options: Partial<DefaultAvatarOptions> = {}
  ): string {
    const opts: DefaultAvatarOptions = {
      style: 'initials',
      backgroundColor: '#6366f1',
      textColor: '#ffffff',
      size: 200,
      format: 'svg',
      ...options
    };

    const initials = this.getInitials(celebrityName);
    const fontSize = opts.size * 0.4;

    switch (opts.style) {
      case 'initials':
        return this.generateInitialsAvatar(initials, opts, fontSize);
      case 'geometric':
        return this.generateGeometricAvatar(celebrityName, opts);
      case 'abstract':
        return this.generateAbstractAvatar(celebrityName, opts);
      case 'silhouette':
        return this.generateSilhouetteAvatar(opts);
      default:
        return this.generateInitialsAvatar(initials, opts, fontSize);
    }
  }

  private generateInitialsAvatar(
    initials: string,
    opts: DefaultAvatarOptions,
    fontSize: number
  ): string {
    return `
      <svg width="${opts.size}" height="${opts.size}" viewBox="0 0 ${opts.size} ${opts.size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${opts.size}" height="${opts.size}" fill="${opts.backgroundColor}" rx="${opts.size * 0.1}"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" 
              fill="${opts.textColor}" text-anchor="middle" dominant-baseline="central">
          ${initials}
        </text>
      </svg>
    `.trim();
  }

  private generateGeometricAvatar(celebrityName: string, opts: DefaultAvatarOptions): string {
    const hash = this.simpleHash(celebrityName);
    const colors = this.generateColorPalette(hash, opts.backgroundColor);
    const shapes = this.generateGeometricShapes(hash, opts.size);

    return `
      <svg width="${opts.size}" height="${opts.size}" viewBox="0 0 ${opts.size} ${opts.size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${opts.size}" height="${opts.size}" fill="${colors[0]}" rx="${opts.size * 0.1}"/>
        ${shapes.join('\n        ')}
      </svg>
    `.trim();
  }

  private generateAbstractAvatar(celebrityName: string, opts: DefaultAvatarOptions): string {
    const hash = this.simpleHash(celebrityName);
    const colors = this.generateColorPalette(hash, opts.backgroundColor);
    const gradientId = `gradient-${hash}`;

    return `
      <svg width="${opts.size}" height="${opts.size}" viewBox="0 0 ${opts.size} ${opts.size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="${gradientId}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${colors[0]}"/>
            <stop offset="50%" stop-color="${colors[1]}"/>
            <stop offset="100%" stop-color="${colors[2]}"/>
          </radialGradient>
        </defs>
        <rect width="${opts.size}" height="${opts.size}" fill="url(#${gradientId})" rx="${opts.size * 0.1}"/>
        <circle cx="${opts.size * 0.3}" cy="${opts.size * 0.3}" r="${opts.size * 0.15}" fill="${colors[3]}" opacity="0.6"/>
        <circle cx="${opts.size * 0.7}" cy="${opts.size * 0.7}" r="${opts.size * 0.1}" fill="${colors[4]}" opacity="0.8"/>
      </svg>
    `.trim();
  }

  private generateSilhouetteAvatar(opts: DefaultAvatarOptions): string {
    const headPath = `M${opts.size * 0.5},${opts.size * 0.2} 
                     C${opts.size * 0.7},${opts.size * 0.2} ${opts.size * 0.8},${opts.size * 0.35} ${opts.size * 0.8},${opts.size * 0.45}
                     C${opts.size * 0.8},${opts.size * 0.55} ${opts.size * 0.75},${opts.size * 0.65} ${opts.size * 0.65},${opts.size * 0.7}
                     L${opts.size * 0.35},${opts.size * 0.7}
                     C${opts.size * 0.25},${opts.size * 0.65} ${opts.size * 0.2},${opts.size * 0.55} ${opts.size * 0.2},${opts.size * 0.45}
                     C${opts.size * 0.2},${opts.size * 0.35} ${opts.size * 0.3},${opts.size * 0.2} ${opts.size * 0.5},${opts.size * 0.2} Z`;

    return `
      <svg width="${opts.size}" height="${opts.size}" viewBox="0 0 ${opts.size} ${opts.size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${opts.size}" height="${opts.size}" fill="${opts.backgroundColor}" rx="${opts.size * 0.1}"/>
        <path d="${headPath}" fill="${opts.textColor}" opacity="0.8"/>
      </svg>
    `.trim();
  }

  /**
   * Cache results for future use
   */
  async cacheResult(
    key: string,
    data: any,
    source: CachedResult['source'],
    expiryMs: number = this.defaultCacheExpiry
  ): Promise<void> {
    try {
      const cachedResult: CachedResult = {
        celebrityName: key,
        timestamp: Date.now(),
        data,
        expiresAt: Date.now() + expiryMs,
        source
      };

      const cacheFile = path.join(this.cacheDir, `${this.normalizeCelebrityName(key)}-${source}.json`);
      await fs.writeFile(cacheFile, JSON.stringify(cachedResult, null, 2));

      logger.debug(`Cached result for ${key}`, {
        key,
        source,
        expiresAt: new Date(cachedResult.expiresAt).toISOString()
      });

    } catch (error) {
      logger.error(`Failed to cache result for ${key}`, error instanceof Error ? error : new Error(String(error)), {
        key,
        source
      });
    }
  }

  /**
   * Get cached results if available and not expired
   */
  async getCachedResult(
    key: string,
    source: CachedResult['source']
  ): Promise<any | null> {
    try {
      const cacheFile = path.join(this.cacheDir, `${this.normalizeCelebrityName(key)}-${source}.json`);
      
      if (!existsSync(cacheFile)) {
        return null;
      }

      const fileContent = await fs.readFile(cacheFile, 'utf-8');
      const cachedResult: CachedResult = JSON.parse(fileContent);

      // Check if cache is expired
      if (Date.now() > cachedResult.expiresAt) {
        logger.debug(`Cache expired for ${key}`, {
          key,
          source,
          expiredAt: new Date(cachedResult.expiresAt).toISOString()
        });
        
        // Clean up expired cache
        await fs.unlink(cacheFile).catch(() => {});
        return null;
      }

      logger.debug(`Cache hit for ${key}`, {
        key,
        source,
        cachedAt: new Date(cachedResult.timestamp).toISOString()
      });

      return cachedResult.data;

    } catch (error) {
      logger.error(`Failed to get cached result for ${key}`, error instanceof Error ? error : new Error(String(error)), {
        key,
        source
      });
      return null;
    }
  }

  /**
   * Clean up expired cache files
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      if (!existsSync(this.cacheDir)) {
        return;
      }

      const files = await fs.readdir(this.cacheDir);
      let cleanedCount = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          
          try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const cachedResult: CachedResult = JSON.parse(fileContent);
            
            if (Date.now() > cachedResult.expiresAt) {
              await fs.unlink(filePath);
              cleanedCount++;
            }
          } catch (error) {
            // If we can't parse the file, delete it
            await fs.unlink(filePath);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired cache files`);
      }

    } catch (error) {
      logger.error('Failed to cleanup expired cache', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get fallback celebrity data when APIs are unavailable
   */
  async getFallbackCelebrityData(celebrityName: string): Promise<{
    images: LocalImageInfo[];
    avatar: string;
    description: string;
    hasLocalImages: boolean;
  }> {
    const localImages = await this.getLocalCelebrityImages(celebrityName);
    const hasLocalImages = localImages.length > 0;
    
    // Try to get cached description first
    let description = await this.getCachedResult(celebrityName, 'gemini_analysis');
    
    if (!description) {
      description = `${celebrityName} is a well-known celebrity. This is a fallback description as the AI analysis service is currently unavailable.`;
    }

    // Generate default avatar if no local images
    const avatar = hasLocalImages 
      ? `/images/celebrities/${localImages[0].filename}`
      : this.generateDefaultAvatar(celebrityName, {
          style: 'initials',
          backgroundColor: this.getColorForName(celebrityName),
          size: 200
        });

    return {
      images: localImages,
      avatar,
      description,
      hasLocalImages
    };
  }

  // Helper methods
  private normalizeCelebrityName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  private isImageFile(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  private extractCelebrityNameFromFile(filename: string): string | null {
    // Remove extension and numbers/suffixes
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
    const cleanName = nameWithoutExt.replace(/-\d+$/, '').replace(/-avatar$/, '').replace(/-profile$/, '');
    
    // Convert back to readable name
    return cleanName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private generateColorPalette(hash: number, baseColor: string): string[] {
    const colors = [baseColor];
    const hue = hash % 360;
    
    for (let i = 1; i < 5; i++) {
      const newHue = (hue + (i * 72)) % 360;
      colors.push(`hsl(${newHue}, 70%, 60%)`);
    }
    
    return colors;
  }

  private generateGeometricShapes(hash: number, size: number): string[] {
    const shapes: string[] = [];
    const shapeCount = (hash % 3) + 2;
    
    for (let i = 0; i < shapeCount; i++) {
      const x = (hash * (i + 1)) % (size * 0.8);
      const y = (hash * (i + 2)) % (size * 0.8);
      const radius = (hash % 30) + 10;
      const opacity = 0.3 + ((hash % 40) / 100);
      
      shapes.push(`<circle cx="${x}" cy="${y}" r="${radius}" fill="white" opacity="${opacity}"/>`);
    }
    
    return shapes;
  }

  private getColorForName(name: string): string {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
      '#eab308', '#22c55e', '#10b981', '#06b6d4', '#3b82f6'
    ];
    
    const hash = this.simpleHash(name);
    return colors[hash % colors.length];
  }
}

export const fallbackService = new FallbackService();
export type { LocalImageInfo, DefaultAvatarOptions, CachedResult };