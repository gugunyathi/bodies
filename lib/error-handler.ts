import { logger } from './logger';

// Error types for different components
export enum ErrorType {
  GOOGLE_SEARCH_ERROR = 'GOOGLE_SEARCH_ERROR',
  GEMINI_API_ERROR = 'GEMINI_API_ERROR',
  IMAGE_PROCESSING_ERROR = 'IMAGE_PROCESSING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  QUOTA_EXCEEDED_ERROR = 'QUOTA_EXCEEDED_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorContext {
  component: string;
  operation: string;
  celebrityName?: string;
  imageUrl?: string;
  attempt?: number;
  maxAttempts?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  originalError?: Error;
  context: ErrorContext;
  recoverable: boolean;
  retryAfter?: number; // milliseconds
  fallbackAvailable: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

export interface FallbackConfig {
  useLocalImages: boolean;
  useDefaultAvatars: boolean;
  useCachedResults: boolean;
  skipFailedCelebrities: boolean;
  continueOnPartialFailure: boolean;
}

class ErrorHandler {
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.RATE_LIMIT_ERROR,
      ErrorType.GOOGLE_SEARCH_ERROR,
      ErrorType.GEMINI_API_ERROR
    ]
  };

  private defaultFallbackConfig: FallbackConfig = {
    useLocalImages: true,
    useDefaultAvatars: true,
    useCachedResults: true,
    skipFailedCelebrities: false,
    continueOnPartialFailure: true
  };

  /**
   * Classify error and determine handling strategy
   */
  classifyError(error: Error, context: ErrorContext): ErrorDetails {
    let errorType = ErrorType.UNKNOWN_ERROR;
    let recoverable = false;
    let retryAfter: number | undefined;
    let fallbackAvailable = true;

    const errorMessage = error.message.toLowerCase();

    // Network and timeout errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
        errorMessage.includes('connection') || error.name === 'NetworkError') {
      errorType = ErrorType.NETWORK_ERROR;
      recoverable = true;
      retryAfter = 2000;
    }
    // Timeout errors
    else if (errorMessage.includes('timeout') || error.name === 'TimeoutError') {
      errorType = ErrorType.TIMEOUT_ERROR;
      recoverable = true;
      retryAfter = 5000;
    }
    // Rate limiting
    else if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests') ||
             errorMessage.includes('429')) {
      errorType = ErrorType.RATE_LIMIT_ERROR;
      recoverable = true;
      retryAfter = 60000; // 1 minute
    }
    // Quota exceeded
    else if (errorMessage.includes('quota') || errorMessage.includes('limit exceeded') ||
             errorMessage.includes('403')) {
      errorType = ErrorType.QUOTA_EXCEEDED_ERROR;
      recoverable = false;
      fallbackAvailable = true;
    }
    // Authentication errors
    else if (errorMessage.includes('unauthorized') || errorMessage.includes('invalid key') ||
             errorMessage.includes('401') || errorMessage.includes('authentication')) {
      errorType = ErrorType.AUTHENTICATION_ERROR;
      recoverable = false;
      fallbackAvailable = true;
    }
    // Google Search API specific errors
    else if (context.component === 'GoogleSearchService') {
      errorType = ErrorType.GOOGLE_SEARCH_ERROR;
      recoverable = !errorMessage.includes('invalid') && !errorMessage.includes('not found');
      retryAfter = 3000;
    }
    // Gemini API specific errors
    else if (context.component === 'GeminiAvatarService') {
      errorType = ErrorType.GEMINI_API_ERROR;
      recoverable = !errorMessage.includes('invalid') && !errorMessage.includes('unsupported');
      retryAfter = 2000;
    }
    // Image processing errors
    else if (context.component === 'ImageProcessor') {
      errorType = ErrorType.IMAGE_PROCESSING_ERROR;
      recoverable = !errorMessage.includes('invalid format') && !errorMessage.includes('corrupted');
      retryAfter = 1000;
    }
    // Validation errors
    else if (errorMessage.includes('validation') || errorMessage.includes('invalid input')) {
      errorType = ErrorType.VALIDATION_ERROR;
      recoverable = false;
      fallbackAvailable = false;
    }

    return {
      type: errorType,
      message: error.message,
      originalError: error,
      context,
      recoverable,
      retryAfter,
      fallbackAvailable
    };
  }

  /**
   * Execute operation with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`Operation succeeded on attempt ${attempt}`, {
            component: context.component,
            operation: context.operation,
            attempt,
            maxAttempts: config.maxAttempts
          });
        }
        
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const errorDetails = this.classifyError(lastError, {
          ...context,
          attempt,
          maxAttempts: config.maxAttempts
        });
        
        logger.warn(`Operation failed on attempt ${attempt}`, {
          component: context.component,
          operation: context.operation,
          attempt,
          maxAttempts: config.maxAttempts,
          errorType: errorDetails.type,
          errorMessage: errorDetails.message,
          recoverable: errorDetails.recoverable
        });
        
        // Don't retry if error is not recoverable or not in retryable list
        if (!errorDetails.recoverable || !config.retryableErrors.includes(errorDetails.type)) {
          throw lastError;
        }
        
        // Don't retry on last attempt
        if (attempt === config.maxAttempts) {
          throw lastError;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        // Use error-specific retry delay if available
        const actualDelay = errorDetails.retryAfter || delay;
        
        logger.info(`Retrying operation in ${actualDelay}ms`, {
          component: context.component,
          operation: context.operation,
          attempt: attempt + 1,
          delay: actualDelay
        });
        
        await new Promise(resolve => setTimeout(resolve, actualDelay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Execute operation with fallback mechanisms
   */
  async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperations: Array<() => Promise<T>>,
    context: ErrorContext,
    fallbackConfig: Partial<FallbackConfig> = {}
  ): Promise<T> {
    const config = { ...this.defaultFallbackConfig, ...fallbackConfig };
    const errors: ErrorDetails[] = [];
    
    // Try primary operation first
    try {
      return await primaryOperation();
    } catch (error) {
      const errorDetails = this.classifyError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      
      errors.push(errorDetails);
      
      logger.warn(`Primary operation failed, trying fallbacks`, {
        component: context.component,
        operation: context.operation,
        errorType: errorDetails.type,
        fallbacksAvailable: fallbackOperations.length
      });
      
      // If fallback is not available for this error type, throw immediately
      if (!errorDetails.fallbackAvailable) {
        throw error;
      }
    }
    
    // Try fallback operations
    for (let i = 0; i < fallbackOperations.length; i++) {
      try {
        const result = await fallbackOperations[i]();
        
        logger.info(`Fallback operation ${i + 1} succeeded`, {
          component: context.component,
          operation: context.operation,
          fallbackIndex: i + 1,
          totalFallbacks: fallbackOperations.length
        });
        
        return result;
        
      } catch (error) {
        const errorDetails = this.classifyError(
          error instanceof Error ? error : new Error(String(error)),
          { ...context, operation: `${context.operation}_fallback_${i + 1}` }
        );
        
        errors.push(errorDetails);
        
        logger.warn(`Fallback operation ${i + 1} failed`, {
          component: context.component,
          operation: context.operation,
          fallbackIndex: i + 1,
          errorType: errorDetails.type,
          errorMessage: errorDetails.message
        });
      }
    }
    
    // All operations failed
    const aggregatedError = new Error(
      `All operations failed. Primary: ${errors[0]?.message}. Fallbacks: ${errors.slice(1).map(e => e.message).join(', ')}`
    );
    
    logger.error(`All operations and fallbacks failed`, aggregatedError, {
      component: context.component,
      operation: context.operation,
      totalErrors: errors.length,
      errors: errors.map(e => ({ type: e.type, message: e.message }))
    });
    
    throw aggregatedError;
  }

  /**
   * Create a circuit breaker for repeated failures
   */
  createCircuitBreaker<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: {
      failureThreshold: number;
      resetTimeout: number;
      monitoringPeriod: number;
    } = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000 // 5 minutes
    }
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let circuitOpen = false;
    
    return async (): Promise<T> => {
      const now = Date.now();
      
      // Reset circuit if enough time has passed
      if (circuitOpen && now - lastFailureTime > options.resetTimeout) {
        circuitOpen = false;
        failures = 0;
        logger.info(`Circuit breaker reset`, {
          component: context.component,
          operation: context.operation
        });
      }
      
      // Fail fast if circuit is open
      if (circuitOpen) {
        throw new Error(`Circuit breaker is open for ${context.component}.${context.operation}`);
      }
      
      try {
        const result = await operation();
        
        // Reset failure count on success
        if (failures > 0) {
          failures = 0;
          logger.info(`Circuit breaker success after failures`, {
            component: context.component,
            operation: context.operation
          });
        }
        
        return result;
        
      } catch (error) {
        failures++;
        lastFailureTime = now;
        
        // Open circuit if threshold reached
        if (failures >= options.failureThreshold) {
          circuitOpen = true;
          logger.error(`Circuit breaker opened`, error instanceof Error ? error : new Error(String(error)), {
            component: context.component,
            operation: context.operation,
            failures,
            threshold: options.failureThreshold
          });
        }
        
        throw error;
      }
    };
  }

  /**
   * Handle batch operation errors with partial success support
   */
  async handleBatchOperation<T, R>(
    items: T[],
    operation: (item: T, index: number) => Promise<R>,
    context: ErrorContext,
    options: {
      continueOnError?: boolean;
      maxConcurrent?: number;
      delayBetweenItems?: number;
    } = {}
  ): Promise<{
    results: (R | null)[];
    errors: Array<{ index: number; item: T; error: ErrorDetails }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
  }> {
    const {
      continueOnError = true,
      maxConcurrent = 3,
      delayBetweenItems = 1000
    } = options;
    
    const results: (R | null)[] = new Array(items.length).fill(null);
    const errors: Array<{ index: number; item: T; error: ErrorDetails }> = [];
    
    // Process items in batches to respect concurrency limits
    for (let i = 0; i < items.length; i += maxConcurrent) {
      const batch = items.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (item, batchIndex) => {
        const actualIndex = i + batchIndex;
        
        try {
          const result = await operation(item, actualIndex);
          results[actualIndex] = result;
          
        } catch (error) {
          const errorDetails = this.classifyError(
            error instanceof Error ? error : new Error(String(error)),
            { ...context, metadata: { itemIndex: actualIndex, item } }
          );
          
          errors.push({
            index: actualIndex,
            item,
            error: errorDetails
          });
          
          logger.warn(`Batch item ${actualIndex} failed`, {
            component: context.component,
            operation: context.operation,
            itemIndex: actualIndex,
            errorType: errorDetails.type,
            continueOnError
          });
          
          if (!continueOnError) {
            throw error;
          }
        }
      });
      
      await Promise.all(batchPromises);
      
      // Add delay between batches
      if (delayBetweenItems > 0 && i + maxConcurrent < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenItems));
      }
    }
    
    const successful = results.filter(r => r !== null).length;
    const failed = errors.length;
    
    return {
      results,
      errors,
      summary: {
        total: items.length,
        successful,
        failed,
        successRate: items.length > 0 ? successful / items.length : 0
      }
    };
  }
}

export const errorHandler = new ErrorHandler();
export { ErrorHandler };