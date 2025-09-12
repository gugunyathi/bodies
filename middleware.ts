// Production-ready middleware for Next.js application
// Handles security headers, CORS, rate limiting, and request logging

import { NextRequest, NextResponse } from 'next/server';
import { logger, createRequestContext } from './lib/logger';

// Security headers configuration
const SECURITY_HEADERS = {
  // Content Security Policy - Adjust based on your app's needs
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel.app https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https:",
    "connect-src 'self' https: wss: https://*.mongodb.net https://*.vercel.app",
    "frame-src 'self' https://vercel.live",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),
  
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Feature policy / Permissions policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()'
  ].join(', '),
  
  // Prevent XSS attacks
  'X-XSS-Protection': '1; mode=block',
  
  // HSTS (only in production with HTTPS)
  ...(process.env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  }),
  
  // Remove server information
  'X-Powered-By': '',
};

// CORS configuration
const CORS_CONFIG = {
  allowedOrigins: process.env.CORS_ORIGINS?.split(',') || [
    '*',
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Rate limiting configuration (simple in-memory store)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX || (process.env.NODE_ENV === 'development' ? '1000' : '100')),
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return cfConnectingIP || realIP || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rate_limit:${ip}`;
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    const resetTime = now + RATE_LIMIT_CONFIG.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxRequests - 1,
      resetTime
    };
  }
  
  if (current.count >= RATE_LIMIT_CONFIG.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    };
  }
  
  current.count++;
  rateLimitStore.set(key, current);
  
  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.maxRequests - current.count,
    resetTime: current.resetTime
  };
}

function handleCORS(request: NextRequest, origin: string | null): Record<string, string> {
  const corsHeaders: Record<string, string> = {};
  
  // Check if origin is allowed
  const isAllowedOrigin = !origin || 
    CORS_CONFIG.allowedOrigins.includes('*') ||
    CORS_CONFIG.allowedOrigins.includes(origin) ||
    (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost'));
  
  if (isAllowedOrigin) {
    // Use '*' for public access or specific origin if provided
    corsHeaders['Access-Control-Allow-Origin'] = CORS_CONFIG.allowedOrigins.includes('*') ? '*' : (origin || '*');
  }
  
  corsHeaders['Access-Control-Allow-Methods'] = CORS_CONFIG.allowedMethods.join(', ');
  corsHeaders['Access-Control-Allow-Headers'] = CORS_CONFIG.allowedHeaders.join(', ');
  corsHeaders['Access-Control-Expose-Headers'] = CORS_CONFIG.exposedHeaders.join(', ');
  corsHeaders['Access-Control-Max-Age'] = CORS_CONFIG.maxAge.toString();
  
  if (CORS_CONFIG.credentials) {
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return corsHeaders;
}

function shouldSkipMiddleware(pathname: string): boolean {
  // Skip middleware for static files and Next.js internals
  const skipPatterns = [
    '/_next/',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.json',
    '/.well-known/',
    '/api/health', // Health check endpoint
  ];
  
  return skipPatterns.some(pattern => pathname.startsWith(pattern)) ||
         pathname.includes('.') && !pathname.startsWith('/api/');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const origin = request.headers.get('origin');
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Skip middleware for certain paths
  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }
  
  // Create request context for logging
  const context = createRequestContext(request);
  const ip = getClientIP(request);
  
  // Rate limiting configuration
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === 'unknown';
  const skipRateLimit = pathname.startsWith('/api/health') || 
    (process.env.NODE_ENV === 'development' && isLocalhost);
  
  // Log incoming request
  logger.info('Incoming request', {
    method,
    pathname,
    origin,
    userAgent,
    ip,
  }, { requestId: context.requestId, ip });
  
  // Handle preflight OPTIONS requests
  if (method === 'OPTIONS') {
    const corsHeaders = handleCORS(request, origin);
    return new NextResponse(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        ...SECURITY_HEADERS,
      },
    });
  }
  
  // Rate limiting (skip for health checks and localhost in development)
  
  if (!skipRateLimit) {
    const rateLimit = checkRateLimit(ip);
    
    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded', {
        ip,
        pathname,
        method,
        resetTime: new Date(rateLimit.resetTime).toISOString(),
      }, { requestId: context.requestId, ip });
      
      return new NextResponse(
        JSON.stringify({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
            ...SECURITY_HEADERS,
          },
        }
      );
    }
  }
  
  // Security checks for API routes
  if (pathname.startsWith('/api/')) {
    // Block requests with suspicious patterns
    const suspiciousPatterns = [
      /\.\.\//,  // Path traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /javascript:/i, // JavaScript protocol
    ];
    
    const fullUrl = request.url;
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(fullUrl));
    
    if (isSuspicious) {
      logger.securityEvent(
        'Suspicious request blocked',
        'high',
        {
          url: fullUrl,
          method,
          userAgent,
          patterns: suspiciousPatterns.map(p => p.toString()),
        },
        undefined,
        ip
      );
      
      return new NextResponse(
        JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'Request blocked',
          },
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...SECURITY_HEADERS,
          },
        }
      );
    }
    
    // Validate Content-Type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return new NextResponse(
          JSON.stringify({
            error: {
              code: 'INVALID_CONTENT_TYPE',
              message: 'Content-Type must be application/json',
            },
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...SECURITY_HEADERS,
            },
          }
        );
      }
    }
  }
  
  // Create response with security headers
  const response = NextResponse.next();
  
  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value);
    } else {
      response.headers.delete(key); // Remove headers like X-Powered-By
    }
  });
  
  // Add CORS headers
  const corsHeaders = handleCORS(request, origin);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add request ID header
  response.headers.set('X-Request-ID', context.requestId);
  
  // Add rate limit headers
  if (!skipRateLimit) {
    const rateLimit = checkRateLimit(ip);
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_CONFIG.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
  }
  
  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

// Export rate limit checker for use in API routes if needed
export { checkRateLimit, getClientIP };