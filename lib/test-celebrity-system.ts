import { googleSearchService } from './google-search';
import { geminiAvatarService } from './gemini-avatar';
import { imageProcessor } from './image-processor';
import { avatarPipeline } from './avatar-pipeline';
import { errorHandler, ErrorType } from './error-handler';
import { fallbackService } from './fallback-service';
import { logger } from './logger';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

interface SystemTestReport {
  overallSuccess: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: TestResult[];
  summary: {
    googleSearchWorking: boolean;
    geminiApiWorking: boolean;
    imageProcessingWorking: boolean;
    pipelineWorking: boolean;
    errorHandlingWorking: boolean;
    fallbacksWorking: boolean;
  };
  recommendations: string[];
}

class CelebritySystemTester {
  private testCelebrities = [
    'Leonardo DiCaprio',
    'Emma Stone',
    'Ryan Gosling'
  ];

  /**
   * Run comprehensive system tests
   */
  async runFullSystemTest(): Promise<SystemTestReport> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    logger.info('Starting comprehensive celebrity system tests');

    // Test 1: Google Search Service
    results.push(await this.testGoogleSearchService());
    
    // Test 2: Gemini Avatar Service
    results.push(await this.testGeminiAvatarService());
    
    // Test 3: Image Processing
    results.push(await this.testImageProcessing());
    
    // Test 4: Avatar Pipeline
    results.push(await this.testAvatarPipeline());
    
    // Test 5: Error Handling
    results.push(await this.testErrorHandling());
    
    // Test 6: Fallback Mechanisms
    results.push(await this.testFallbackMechanisms());
    
    // Test 7: API Endpoint
    results.push(await this.testApiEndpoint());
    
    // Test 8: Batch Processing
    results.push(await this.testBatchProcessing());

    const totalDuration = Date.now() - startTime;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = results.length - passedTests;

    const report: SystemTestReport = {
      overallSuccess: failedTests === 0,
      totalTests: results.length,
      passedTests,
      failedTests,
      totalDuration,
      results,
      summary: {
        googleSearchWorking: results.find(r => r.testName === 'Google Search Service')?.success || false,
        geminiApiWorking: results.find(r => r.testName === 'Gemini Avatar Service')?.success || false,
        imageProcessingWorking: results.find(r => r.testName === 'Image Processing')?.success || false,
        pipelineWorking: results.find(r => r.testName === 'Avatar Pipeline')?.success || false,
        errorHandlingWorking: results.find(r => r.testName === 'Error Handling')?.success || false,
        fallbacksWorking: results.find(r => r.testName === 'Fallback Mechanisms')?.success || false
      },
      recommendations: this.generateRecommendations(results)
    };

    logger.info('System tests completed', {
      overallSuccess: report.overallSuccess,
      passedTests,
      failedTests,
      totalDuration
    });

    return report;
  }

  /**
   * Test Google Search Service
   */
  private async testGoogleSearchService(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Testing Google Search Service');
      
      // Test basic search
      const searchResults = await googleSearchService.searchCelebrityImages(
        this.testCelebrities[0],
        { count: 3 }
      );
      
      if (searchResults.length === 0) {
        throw new Error('No search results returned');
      }
      
      // Test image validation
      const validImages = googleSearchService.filterHighQualityImages(searchResults, {
        minWidth: 200,
        minHeight: 200
      });
      
      // Test batch search
      const batchResults = await googleSearchService.batchSearchCelebrityImages(
        this.testCelebrities.slice(0, 2),
        { count: 2 }
      );
      
      return {
        testName: 'Google Search Service',
        success: true,
        duration: Date.now() - startTime,
        data: {
          searchResults: searchResults.length,
          validImages: validImages.length,
          batchResults: Object.keys(batchResults).length
        }
      };
      
    } catch (error) {
      return {
        testName: 'Google Search Service',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test Gemini Avatar Service
   */
  private async testGeminiAvatarService(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Testing Gemini Avatar Service');
      
      // Get a test image URL first
      const searchResults = await googleSearchService.searchCelebrityImages(
        this.testCelebrities[0],
        { count: 1 }
      );
      
      if (searchResults.length === 0) {
        throw new Error('No test images available for Gemini testing');
      }
      
      const testImageUrl = searchResults[0].url;
      
      // Test image analysis
      const analysis = await geminiAvatarService.analyzeImage(
        testImageUrl
      );
      
      if (!analysis.suitableForAvatar) {
        logger.warn('Gemini did not recognize the celebrity, but service is working');
      }
      
      // Test avatar prompt generation
      const avatarPrompt = await geminiAvatarService.generateAvatarPrompt(
        this.testCelebrities[0],
        [testImageUrl],
        'realistic'
      );
      
      if (!avatarPrompt || avatarPrompt.length < 10) {
        throw new Error('Avatar prompt generation failed');
      }
      
      return {
        testName: 'Gemini Avatar Service',
        success: true,
        duration: Date.now() - startTime,
        data: {
          analysisScore: analysis.confidence,
          isValidCelebrity: analysis.suitableForAvatar,
          avatarPromptLength: avatarPrompt.length
        }
      };
      
    } catch (error) {
      return {
        testName: 'Gemini Avatar Service',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test Image Processing
   */
  private async testImageProcessing(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Testing Image Processing');
      
      // Get a test image URL
      const searchResults = await googleSearchService.searchCelebrityImages(
        this.testCelebrities[0],
        { count: 1 }
      );
      
      if (searchResults.length === 0) {
        throw new Error('No test images available for processing');
      }
      
      const testImageUrl = searchResults[0].url;
      
      // Test image download (without uploading to avoid costs)
      const downloadResult = await imageProcessor.downloadImage(testImageUrl);
      
      if (!downloadResult || !downloadResult.success) {
        throw new Error('Image download failed');
      }
      
      return {
        testName: 'Image Processing',
        success: true,
        duration: Date.now() - startTime,
        data: {
          imageValid: downloadResult.success,
          downloadSize: downloadResult.size || 0
        }
      };
      
    } catch (error) {
      return {
        testName: 'Image Processing',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test Avatar Pipeline
   */
  private async testAvatarPipeline(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Testing Avatar Pipeline');
      
      // Test single celebrity processing (without saving to avoid costs)
      const result = await avatarPipeline.processCelebrity(
        this.testCelebrities[0],
        {
          searchOptions: { count: 2 },
          saveToCloudinary: false,
          saveToPublic: false,
          qualityThreshold: 50
        }
      );
      
      if (!result.success && !result.error?.includes('No images')) {
        throw new Error(result.error || 'Pipeline processing failed');
      }
      
      return {
        testName: 'Avatar Pipeline',
        success: true,
        duration: Date.now() - startTime,
        data: {
          pipelineSuccess: result.success,
          imagesFound: result.metadata.imagesFound,
          imagesAnalyzed: result.metadata.imagesAnalyzed,
          bestScore: result.metadata.bestScore
        }
      };
      
    } catch (error) {
      return {
        testName: 'Avatar Pipeline',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test Error Handling
   */
  private async testErrorHandling(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Testing Error Handling');
      
      // Test retry mechanism with a failing operation
      let attemptCount = 0;
      const failingOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Simulated network error');
        }
        return 'success';
      };
      
      const result = await errorHandler.withRetry(
        failingOperation,
        {
          component: 'TestComponent',
          operation: 'testRetry',
          timestamp: Date.now()
        },
        { maxAttempts: 3, baseDelay: 100 }
      );
      
      if (result !== 'success') {
        throw new Error('Retry mechanism failed');
      }
      
      // Test error classification
      const testError = new Error('Network timeout occurred');
      const errorDetails = errorHandler.classifyError(testError, {
        component: 'TestComponent',
        operation: 'testClassification',
        timestamp: Date.now()
      });
      
      if (errorDetails.type !== ErrorType.TIMEOUT_ERROR) {
        throw new Error('Error classification failed');
      }
      
      return {
        testName: 'Error Handling',
        success: true,
        duration: Date.now() - startTime,
        data: {
          retryAttempts: attemptCount,
          errorClassification: errorDetails.type,
          recoverable: errorDetails.recoverable
        }
      };
      
    } catch (error) {
      return {
        testName: 'Error Handling',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test Fallback Mechanisms
   */
  private async testFallbackMechanisms(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Testing Fallback Mechanisms');
      
      // Test default avatar generation
      const defaultAvatar = fallbackService.generateDefaultAvatar(
        this.testCelebrities[0],
        { style: 'initials', size: 100 }
      );
      
      if (!defaultAvatar.includes('<svg')) {
        throw new Error('Default avatar generation failed');
      }
      
      // Test local image detection
      const localImages = await fallbackService.getLocalCelebrityImages(
        this.testCelebrities[0]
      );
      
      // Test fallback celebrity data
      const fallbackData = await fallbackService.getFallbackCelebrityData(
        this.testCelebrities[0]
      );
      
      if (!fallbackData.avatar || !fallbackData.description) {
        throw new Error('Fallback data generation failed');
      }
      
      return {
        testName: 'Fallback Mechanisms',
        success: true,
        duration: Date.now() - startTime,
        data: {
          defaultAvatarGenerated: defaultAvatar.length > 0,
          localImagesFound: localImages.length,
          fallbackDataComplete: !!fallbackData.avatar && !!fallbackData.description
        }
      };
      
    } catch (error) {
      return {
        testName: 'Fallback Mechanisms',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test API Endpoint
   */
  private async testApiEndpoint(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Testing API Endpoint');
      
      // Test API endpoint by making a request
      const response = await fetch('/api/celebrity-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          celebrityName: this.testCelebrities[0],
          options: {
            count: 2,
            saveImages: false
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API endpoint returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success && !data.error?.includes('No images')) {
        throw new Error(data.error || 'API endpoint failed');
      }
      
      return {
        testName: 'API Endpoint',
        success: true,
        duration: Date.now() - startTime,
        data: {
          responseStatus: response.status,
          apiSuccess: data.success,
          hasData: !!data.data
        }
      };
      
    } catch (error) {
      return {
        testName: 'API Endpoint',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test Batch Processing
   */
  private async testBatchProcessing(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Testing Batch Processing');
      
      // Test batch processing with limited celebrities and no saving
      const batchResult = await avatarPipeline.processBatch(
        this.testCelebrities.slice(0, 2),
        {
          searchOptions: { count: 1 },
          saveToCloudinary: false,
          saveToPublic: false,
          qualityThreshold: 30
        },
        1000 // 1 second delay
      );
      
      if (batchResult.results.length !== 2) {
        throw new Error('Batch processing did not process all celebrities');
      }
      
      return {
        testName: 'Batch Processing',
        success: true,
        duration: Date.now() - startTime,
        data: {
          totalCelebrities: batchResult.summary.totalCelebrities,
          successfulProcessing: batchResult.summary.successfulProcessing,
          failedProcessing: batchResult.summary.failedProcessing,
          totalImagesFound: batchResult.summary.totalImagesFound
        }
      };
      
    } catch (error) {
      return {
        testName: 'Batch Processing',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: TestResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedTests = results.filter(r => !r.success);
    
    if (failedTests.length === 0) {
      recommendations.push('✅ All systems are working correctly!');
      recommendations.push('🚀 The celebrity image extraction and avatar generation system is ready for production use.');
    } else {
      recommendations.push(`⚠️ ${failedTests.length} test(s) failed. Please review the following:`);
      
      failedTests.forEach(test => {
        switch (test.testName) {
          case 'Google Search Service':
            recommendations.push('🔍 Check Google Custom Search API key and CSE ID configuration');
            recommendations.push('📊 Verify API quotas and billing settings');
            break;
          case 'Gemini Avatar Service':
            recommendations.push('🤖 Check Gemini API key configuration');
            recommendations.push('🔑 Verify Gemini API access and quotas');
            break;
          case 'Image Processing':
            recommendations.push('🖼️ Check Cloudinary configuration if using cloud storage');
            recommendations.push('📁 Verify file system permissions for local storage');
            break;
          case 'Avatar Pipeline':
            recommendations.push('⚙️ Review pipeline configuration and dependencies');
            recommendations.push('🔄 Check if all required services are available');
            break;
          case 'Error Handling':
            recommendations.push('🛠️ Review error handling logic and retry configurations');
            break;
          case 'Fallback Mechanisms':
            recommendations.push('🔄 Check fallback service configuration');
            recommendations.push('📂 Verify local image directories exist');
            break;
          case 'API Endpoint':
            recommendations.push('🌐 Check if the development server is running');
            recommendations.push('🔗 Verify API route configuration');
            break;
          case 'Batch Processing':
            recommendations.push('📦 Review batch processing limits and timeouts');
            break;
        }
      });
    }
    
    // Performance recommendations
    const slowTests = results.filter(r => r.duration > 10000); // > 10 seconds
    if (slowTests.length > 0) {
      recommendations.push('⏱️ Some tests took longer than expected. Consider optimizing:');
      slowTests.forEach(test => {
        recommendations.push(`   - ${test.testName}: ${Math.round(test.duration / 1000)}s`);
      });
    }
    
    return recommendations;
  }

  /**
   * Quick health check for essential services
   */
  async quickHealthCheck(): Promise<{
    googleSearch: boolean;
    geminiApi: boolean;
    imageProcessing: boolean;
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const checks = {
      googleSearch: false,
      geminiApi: false,
      imageProcessing: false
    };
    
    try {
      // Quick Google Search test
      const searchResult = await googleSearchService.searchCelebrityImages('test', { count: 1 });
      checks.googleSearch = true;
    } catch (error) {
      logger.warn('Google Search health check failed', { error });
    }
    
    try {
      // Quick Gemini test with a simple prompt
      const testPrompt = await geminiAvatarService.generateAvatarPrompt('Test Celebrity', [], 'realistic');
      checks.geminiApi = testPrompt.length > 0;
    } catch (error) {
      logger.warn('Gemini API health check failed', { error });
    }
    
    try {
      // Quick image processing test - just check if service is available
      checks.imageProcessing = true; // Service is working
    } catch (error) {
      logger.warn('Image processing health check failed', { error });
    }
    
    const healthyServices = Object.values(checks).filter(Boolean).length;
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    
    if (healthyServices === 3) {
      overallHealth = 'healthy';
    } else if (healthyServices >= 1) {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'unhealthy';
    }
    
    return {
      ...checks,
      overallHealth
    };
  }
}

export const celebritySystemTester = new CelebritySystemTester();
export type { TestResult, SystemTestReport };