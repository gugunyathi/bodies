// Error handling utilities - re-exports from errors.ts for backward compatibility

export {
  ValidationError,
  handleApiError,
  AppError,
  ErrorCode,
  ErrorSeverity,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  ConfigurationError,
  asyncHandler,
  validateRequired,
  isOperationalError,
  shouldAlert,
  handleMongoError,
  handleHttpError
} from './errors';