// Production-ready error handling utilities

import { NextResponse } from 'next/server';
import { logger } from './logger';

// Standard error codes
export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Base application error class
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      400,
      ErrorSeverity.LOW,
      true,
      context
    );
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', context?: Record<string, any>) {
    super(
      message,
      ErrorCode.UNAUTHORIZED,
      401,
      ErrorSeverity.MEDIUM,
      true,
      context
    );
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', context?: Record<string, any>) {
    super(
      message,
      ErrorCode.FORBIDDEN,
      403,
      ErrorSeverity.MEDIUM,
      true,
      context
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, any>) {
    super(
      `${resource} not found`,
      ErrorCode.NOT_FOUND,
      404,
      ErrorSeverity.LOW,
      true,
      context
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      ErrorCode.CONFLICT,
      409,
      ErrorSeverity.MEDIUM,
      true,
      context
    );
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', context?: Record<string, any>) {
    super(
      message,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      ErrorSeverity.MEDIUM,
      true,
      context
    );
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error, context?: Record<string, any>) {
    super(
      message,
      ErrorCode.DATABASE_ERROR,
      500,
      ErrorSeverity.HIGH,
      true,
      { ...context, originalError: originalError?.message }
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(
      `External service error (${service}): ${message}`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      502,
      ErrorSeverity.HIGH,
      true,
      context
    );
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      ErrorCode.CONFIGURATION_ERROR,
      500,
      ErrorSeverity.CRITICAL,
      false,
      context
    );
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    timestamp: string;
    requestId?: string;
    details?: Record<string, any>;
  };
}

// Global error handler for API routes
export function handleApiError(
  error: unknown,
  requestId?: string,
  userId?: string,
  ip?: string
): NextResponse<ErrorResponse> {
  let appError: AppError;

  // Convert unknown errors to AppError
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    // Handle known error types
    if (error.name === 'ValidationError') {
      appError = new ValidationError(error.message);
    } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      appError = new DatabaseError('Database operation failed', error);
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      appError = new ExternalServiceError('HTTP', error.message);
    } else {
      // Generic server error
      appError = new AppError(
        'An unexpected error occurred',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        ErrorSeverity.HIGH,
        false,
        { originalError: error.message }
      );
    }
  } else {
    // Handle non-Error objects
    appError = new AppError(
      'An unexpected error occurred',
      ErrorCode.INTERNAL_SERVER_ERROR,
      500,
      ErrorSeverity.HIGH,
      false,
      { originalError: String(error) }
    );
  }

  // Log the error
  logger.error(
    `API Error: ${appError.message}`,
    error instanceof Error ? error : new Error(String(error)),
    {
      code: appError.code,
      statusCode: appError.statusCode,
      severity: appError.severity,
      context: appError.context,
    },
    { userId, requestId, ip }
  );

  // Create error response
  const errorResponse: ErrorResponse = {
    error: {
      code: appError.code,
      message: appError.message,
      timestamp: appError.timestamp,
      requestId,
      // Only include details in development or for operational errors
      details: (process.env.NODE_ENV === 'development' || appError.isOperational) 
        ? appError.context 
        : undefined,
    },
  };

  return NextResponse.json(errorResponse, { status: appError.statusCode });
}

// Async error wrapper for API routes
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Re-throw AppErrors as-is, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        'An unexpected error occurred',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        ErrorSeverity.HIGH,
        false,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  };
}

// Validation helper
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields, providedFields: Object.keys(data) }
    );
  }
}

// Type guard for checking if error is operational
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

// Error monitoring and alerting
export function shouldAlert(error: AppError): boolean {
  return (
    error.severity === ErrorSeverity.CRITICAL ||
    error.severity === ErrorSeverity.HIGH ||
    !error.isOperational
  );
}

// Database error helpers
export function handleMongoError(error: any): AppError {
  if (error.code === 11000) {
    // Duplicate key error
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return new ConflictError(
      `${field} already exists`,
      { field, value: error.keyValue?.[field] }
    );
  }
  
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors || {})
      .map((err: any) => err.message)
      .join(', ');
    return new ValidationError(messages, { mongoValidationError: error.errors });
  }
  
  if (error.name === 'CastError') {
    return new ValidationError(
      `Invalid ${error.path}: ${error.value}`,
      { path: error.path, value: error.value, kind: error.kind }
    );
  }
  
  return new DatabaseError('Database operation failed', error);
}

// HTTP client error helpers
export function handleHttpError(response: Response, service: string): AppError {
  const status = response.status;
  const statusText = response.statusText;
  
  if (status >= 400 && status < 500) {
    return new ExternalServiceError(
      service,
      `Client error: ${status} ${statusText}`,
      { status, statusText }
    );
  }
  
  if (status >= 500) {
    return new ExternalServiceError(
      service,
      `Server error: ${status} ${statusText}`,
      { status, statusText }
    );
  }
  
  return new ExternalServiceError(
    service,
    `Unexpected response: ${status} ${statusText}`,
    { status, statusText }
  );
}

// Usage examples:
// throw new ValidationError('Invalid email format', { email: 'invalid-email' });
// throw new NotFoundError('User', { userId: '123' });
// throw new DatabaseError('Failed to save user', originalError, { userId: '123' });

// In API routes:
// export async function POST(request: Request) {
//   try {
//     const data = await request.json();
//     validateRequired(data, ['name', 'email']);
//     // ... rest of the logic
//   } catch (error) {
//     return handleApiError(error, requestId, userId, ip);
//   }
// }