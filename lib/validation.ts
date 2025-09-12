// Production-ready input validation and sanitization utilities

import { ValidationError } from './errors';

// Common validation patterns
const PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  walletAddress: /^0x[a-fA-F0-9]{40}$/,
  mongoId: /^[0-9a-fA-F]{24}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  username: /^[a-zA-Z0-9_]{3,30}$/,
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
};

// Validation rule types
type ValidationRule = {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: readonly string[];
  custom?: (value: any) => boolean | string;
  sanitize?: (value: any) => any;
  arrayOf?: ValidationRule;
  properties?: Record<string, ValidationRule>;
};

type ValidationSchema = Record<string, ValidationRule>;

// Sanitization functions
export const sanitize = {
  string: (value: string): string => {
    if (typeof value !== 'string') return String(value);
    return value.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control characters
  },

  html: (value: string): string => {
    if (typeof value !== 'string') return String(value);
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  sql: (value: string): string => {
    if (typeof value !== 'string') return String(value);
    return value.replace(/['"\\;]/g, '');
  },

  filename: (value: string): string => {
    if (typeof value !== 'string') return String(value);
    return value.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
  },

  slug: (value: string): string => {
    if (typeof value !== 'string') return String(value);
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },

  number: (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  },

  boolean: (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
    return Boolean(value);
  },

  array: (value: any): any[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return [value];
  },
};

// Validation functions
export const validate = {
  email: (value: string): boolean => PATTERNS.email.test(value),
  walletAddress: (value: string): boolean => PATTERNS.walletAddress.test(value),
  mongoId: (value: string): boolean => PATTERNS.mongoId.test(value),
  url: (value: string): boolean => PATTERNS.url.test(value),
  slug: (value: string): boolean => PATTERNS.slug.test(value),
  username: (value: string): boolean => PATTERNS.username.test(value),
  hexColor: (value: string): boolean => PATTERNS.hexColor.test(value),
  ipAddress: (value: string): boolean => PATTERNS.ipAddress.test(value),

  length: (value: string, min: number, max: number): boolean => {
    const length = value?.length || 0;
    return length >= min && length <= max;
  },

  range: (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  },

  enum: (value: string, allowedValues: readonly string[]): boolean => {
    return allowedValues.includes(value);
  },

  required: (value: any): boolean => {
    return value !== undefined && value !== null && value !== '';
  },

  type: (value: any, expectedType: string): boolean => {
    switch (expectedType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'date': return value instanceof Date || !isNaN(Date.parse(value));
      default: return false;
    }
  },
};

// Main validation function
export function validateData(
  data: Record<string, any>,
  schema: ValidationSchema
): { isValid: boolean; errors: string[]; sanitizedData: Record<string, any> } {
  const errors: string[] = [];
  const sanitizedData: Record<string, any> = {};

  // Check for required fields
  for (const [field, rule] of Object.entries(schema)) {
    if (rule.required && !validate.required(data[field])) {
      errors.push(`${field} is required`);
      continue;
    }

    // Skip validation if field is not provided and not required
    if (!validate.required(data[field]) && !rule.required) {
      continue;
    }

    const value = data[field];
    let sanitizedValue = value;

    // Type validation and conversion
    if (rule.type) {
      if (!validate.type(value, rule.type)) {
        // Try to convert the value
        switch (rule.type) {
          case 'string':
            sanitizedValue = sanitize.string(value);
            break;
          case 'number':
            sanitizedValue = sanitize.number(value);
            if (isNaN(sanitizedValue)) {
              errors.push(`${field} must be a valid number`);
              continue;
            }
            break;
          case 'boolean':
            sanitizedValue = sanitize.boolean(value);
            break;
          case 'array':
            sanitizedValue = sanitize.array(value);
            break;
          case 'date':
            sanitizedValue = new Date(value);
            if (isNaN(sanitizedValue.getTime())) {
              errors.push(`${field} must be a valid date`);
              continue;
            }
            break;
          default:
            errors.push(`${field} must be of type ${rule.type}`);
            continue;
        }
      }
    }

    // Apply custom sanitization
    if (rule.sanitize) {
      sanitizedValue = rule.sanitize(sanitizedValue);
    }

    // Length validation for strings
    if (typeof sanitizedValue === 'string') {
      if (rule.minLength && sanitizedValue.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters long`);
      }
      if (rule.maxLength && sanitizedValue.length > rule.maxLength) {
        errors.push(`${field} must be no more than ${rule.maxLength} characters long`);
      }
    }

    // Range validation for numbers
    if (typeof sanitizedValue === 'number') {
      if (rule.min !== undefined && sanitizedValue < rule.min) {
        errors.push(`${field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && sanitizedValue > rule.max) {
        errors.push(`${field} must be no more than ${rule.max}`);
      }
    }

    // Pattern validation
    if (rule.pattern && typeof sanitizedValue === 'string') {
      if (!rule.pattern.test(sanitizedValue)) {
        errors.push(`${field} format is invalid`);
      }
    }

    // Enum validation
    if (rule.enum && !validate.enum(sanitizedValue, rule.enum)) {
      errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
    }

    // Array validation
    if (rule.arrayOf && Array.isArray(sanitizedValue)) {
      const arrayErrors: string[] = [];
      const sanitizedArray: any[] = [];
      
      for (let i = 0; i < sanitizedValue.length; i++) {
        const itemResult = validateData({ item: sanitizedValue[i] }, { item: rule.arrayOf });
        if (!itemResult.isValid) {
          arrayErrors.push(...itemResult.errors.map(err => `${field}[${i}].${err}`));
        } else {
          sanitizedArray.push(itemResult.sanitizedData.item);
        }
      }
      
      if (arrayErrors.length > 0) {
        errors.push(...arrayErrors);
      } else {
        sanitizedValue = sanitizedArray;
      }
    }

    // Object validation
    if (rule.properties && typeof sanitizedValue === 'object' && sanitizedValue !== null) {
      const objectResult = validateData(sanitizedValue, rule.properties);
      if (!objectResult.isValid) {
        errors.push(...objectResult.errors.map(err => `${field}.${err}`));
      } else {
        sanitizedValue = objectResult.sanitizedData;
      }
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(sanitizedValue);
      if (customResult !== true) {
        errors.push(typeof customResult === 'string' ? customResult : `${field} is invalid`);
      }
    }

    sanitizedData[field] = sanitizedValue;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData,
  };
}

// Predefined schemas for common use cases
export const schemas = {
  // User-related schemas
  user: {
    name: {
      required: true,
      type: 'string' as const,
      minLength: 2,
      maxLength: 100,
      sanitize: sanitize.string,
    },
    email: {
      required: true,
      type: 'string' as const,
      pattern: PATTERNS.email,
      sanitize: (value: string) => sanitize.string(value).toLowerCase(),
    },
    walletAddress: {
      required: true,
      type: 'string' as const,
      pattern: PATTERNS.walletAddress,
      sanitize: (value: string) => sanitize.string(value).toLowerCase(),
    },
  },

  // Evidence-related schemas
  evidence: {
    ratingId: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      maxLength: 100,
      sanitize: sanitize.string,
    },
    uploaderId: {
      required: true,
      type: 'string' as const,
      pattern: PATTERNS.walletAddress,
      sanitize: (value: string) => sanitize.string(value).toLowerCase(),
    },
    type: {
      required: true,
      type: 'string' as const,
      enum: ['image', 'video', 'link', 'text'] as const,
    },
    url: {
      required: false, // Optional for text evidence
      type: 'string' as const,
      pattern: PATTERNS.url,
      sanitize: sanitize.string,
    },
    filename: {
      required: false,
      type: 'string' as const,
      maxLength: 255,
      sanitize: sanitize.filename,
    },
    fileSize: {
      required: false,
      type: 'number' as const,
      min: 0,
      max: 100 * 1024 * 1024, // 100MB max
    },
    mimeType: {
      required: false,
      type: 'string' as const,
      maxLength: 100,
      sanitize: sanitize.string,
    },
    description: {
      required: false,
      type: 'string' as const,
      maxLength: 2000,
      sanitize: sanitize.html,
    },
    textContent: {
      required: false,
      type: 'string' as const,
      maxLength: 5000,
      sanitize: sanitize.html,
    },
    textTitle: {
      required: false,
      type: 'string' as const,
      maxLength: 200,
      sanitize: sanitize.string,
    },
  },

  // Rating-related schemas
  rating: {
    raterId: {
      required: true,
      type: 'string' as const,
      pattern: PATTERNS.walletAddress,
      sanitize: (value: string) => sanitize.string(value).toLowerCase(),
    },
    profileId: {
      required: true,
      type: 'string' as const,
      pattern: PATTERNS.mongoId,
    },
    ratingType: {
      required: true,
      type: 'string' as const,
      enum: ['dated', 'hookup', 'transactional'] as const,
    },
    isAnonymous: {
      required: false,
      type: 'boolean' as const,
      sanitize: sanitize.boolean,
    },
    comment: {
      required: false,
      type: 'string' as const,
      maxLength: 1000,
      sanitize: sanitize.html,
    },
  },

  // Profile-related schemas
  profile: {
    username: {
      required: true,
      type: 'string' as const,
      pattern: PATTERNS.username,
      sanitize: (value: string) => sanitize.string(value).toLowerCase(),
    },
    bio: {
      required: false,
      type: 'string' as const,
      maxLength: 500,
      sanitize: sanitize.html,
    },
    avatar: {
      required: false,
      type: 'string' as const,
      pattern: PATTERNS.url,
    },
    social: {
      required: false,
      type: 'object' as const,
      properties: {
        twitter: {
          type: 'string' as const,
          pattern: /^@?[a-zA-Z0-9_]{1,15}$/,
          sanitize: (value: string) => value.replace(/^@/, ''),
        },
        github: {
          type: 'string' as const,
          pattern: /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
        },
        website: {
          type: 'string' as const,
          pattern: PATTERNS.url,
        },
      },
    },
  },

  // Query parameter schemas
  pagination: {
    page: {
      required: false,
      type: 'number' as const,
      min: 1,
      sanitize: (value: any) => Math.max(1, sanitize.number(value)),
    },
    limit: {
      required: false,
      type: 'number' as const,
      min: 1,
      max: 100,
      sanitize: (value: any) => Math.min(100, Math.max(1, sanitize.number(value))),
    },
    sort: {
      required: false,
      type: 'string' as const,
      enum: ['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'title', '-title'] as const,
    },
  },

  // Search schemas
  search: {
    q: {
      required: true,
      type: 'string' as const,
      minLength: 2,
      maxLength: 100,
      sanitize: sanitize.string,
    },
    category: {
      required: false,
      type: 'string' as const,
      enum: ['all', 'physical', 'digital', 'testimonial', 'document', 'other'] as const,
    },
    tags: {
      required: false,
      type: 'array' as const,
      arrayOf: {
        type: 'string' as const,
        sanitize: sanitize.slug,
      },
    },
  },
};

// Validation middleware for API routes
export function createValidator(schema: ValidationSchema) {
  return (data: Record<string, any>) => {
    const result = validateData(data, schema);
    if (!result.isValid) {
      throw new ValidationError(
        `Validation failed: ${result.errors.join(', ')}`,
        { errors: result.errors, invalidFields: Object.keys(data) }
      );
    }
    return result.sanitizedData;
  };
}

// Helper function to validate request body
export async function validateRequestBody(
  request: Request,
  schema: ValidationSchema
): Promise<Record<string, any>> {
  try {
    const body = await request.json();
    const validator = createValidator(schema);
    return validator(body);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Invalid JSON in request body');
  }
}

// Helper function to validate query parameters
export function validateQueryParams(
  searchParams: URLSearchParams,
  schema: ValidationSchema
): Record<string, any> {
  const data: Record<string, any> = {};
  
  // Convert URLSearchParams to object
  for (const [key, value] of searchParams.entries()) {
    if (data[key]) {
      // Handle multiple values for the same key
      if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    } else {
      data[key] = value;
    }
  }
  
  const validator = createValidator(schema);
  return validator(data);
}

// Usage examples:
// const validator = createValidator(schemas.evidence);
// const validatedData = validator(requestBody);
//
// const validatedBody = await validateRequestBody(request, schemas.evidence);
// const validatedQuery = validateQueryParams(searchParams, schemas.pagination);