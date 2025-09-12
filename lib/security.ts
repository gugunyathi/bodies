import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security configuration
const SECURITY_CONFIG = {
  rateLimit: {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Wallet-Address'],
  },
};

// Rate limiting function
export function rateLimit(request: NextRequest): { success: boolean; error?: string } {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown';
  const now = Date.now();
  const key = `rate_limit:${ip}`;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.rateLimit.windowMs,
    });
    return { success: true };
  }
  
  if (current.count >= SECURITY_CONFIG.rateLimit.maxRequests) {
    return {
      success: false,
      error: 'Too many requests. Please try again later.',
    };
  }
  
  current.count++;
  rateLimitStore.set(key, current);
  return { success: true };
}

// Security headers
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https:",
    ].join('; '),
    
    // Security headers
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    
    // HTTPS enforcement (only in production)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),
  };
}

// CORS headers
export function getCorsHeaders(origin?: string): Record<string, string> {
  // Allow all origins if wildcard is configured, otherwise check specific origin
  const allowedOrigin = SECURITY_CONFIG.cors.origin === '*' ? '*' : 
    (origin && isOriginAllowed(origin) ? origin : SECURITY_CONFIG.cors.origin);
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': SECURITY_CONFIG.cors.methods.join(', '),
    'Access-Control-Allow-Headers': SECURITY_CONFIG.cors.allowedHeaders.join(', '),
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

// Check if origin is allowed
function isOriginAllowed(origin: string): boolean {
  const allowedOrigins = [
    SECURITY_CONFIG.cors.origin,
    'http://localhost:3000',
    'http://localhost:3001',
    '*', // Allow all origins for public API access
    // Add your production domains here
  ];
  
  return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
}

// Input validation helpers
export const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  walletAddress: (address: string): boolean => {
    // Basic Ethereum address validation
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  },
  
  mongoId: (id: string): boolean => {
    // MongoDB ObjectId validation
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  },
  
  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  sanitizeString: (str: string, maxLength = 1000): string => {
    return str
      .trim()
      .slice(0, maxLength)
      .replace(/[<>"'&]/g, (char) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;',
        };
        return entities[char] || char;
      });
  },
};

// API response wrapper with security
export function createSecureResponse(
  data: any,
  status = 200,
  request?: NextRequest
): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Add security headers
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add CORS headers if request is provided
  if (request) {
    const origin = request.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin || undefined);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

// Error response with security
export function createErrorResponse(
  error: string,
  status = 400,
  request?: NextRequest
): NextResponse {
  // Don't expose internal errors in production
  const sanitizedError = process.env.NODE_ENV === 'production' 
    ? (status >= 500 ? 'Internal server error' : error)
    : error;
    
  return createSecureResponse(
    { success: false, error: sanitizedError },
    status,
    request
  );
}

// Middleware wrapper for API routes
export function withSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return createSecureResponse({}, 200, request);
      }
      
      // Rate limiting
      const rateLimitResult = rateLimit(request);
      if (!rateLimitResult.success) {
        return createErrorResponse(rateLimitResult.error!, 429, request);
      }
      
      // Call the actual handler
      const response = await handler(request);
      
      // Add security headers to the response
      const securityHeaders = getSecurityHeaders();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      // Add CORS headers
      const origin = request.headers.get('origin');
      const corsHeaders = getCorsHeaders(origin || undefined);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    } catch (error) {
      console.error('Security middleware error:', error);
      return createErrorResponse('Internal server error', 500, request);
    }
  };
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute