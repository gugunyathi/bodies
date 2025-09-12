// Request context utilities for API endpoints

import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  requestId: string;
  timestamp: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

/**
 * Creates a request context object with unique request ID and metadata
 */
export function createRequestContext(request: NextRequest): RequestContext {
  const requestId = uuidv4();
  const timestamp = new Date().toISOString();
  const method = request.method;
  const url = request.url;
  const userAgent = request.headers.get('user-agent') || undefined;
  
  // Get IP address from various headers
  const ip = request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    undefined;

  // Extract user ID from authorization header or session if available
  const authHeader = request.headers.get('authorization');
  let userId: string | undefined;
  
  if (authHeader) {
    // This is a simple example - in production you'd decode JWT or validate session
    try {
      // For now, just extract from a simple bearer token format
      // In production, you'd decode JWT and extract user ID
      const token = authHeader.replace('Bearer ', '');
      // userId = decodeJWT(token).userId; // Implement JWT decoding
    } catch (error) {
      // Invalid token, userId remains undefined
    }
  }

  return {
    requestId,
    timestamp,
    method,
    url,
    userAgent,
    ip,
    userId
  };
}

/**
 * Extracts request metadata for logging purposes
 */
export function getRequestMetadata(context: RequestContext) {
  return {
    requestId: context.requestId,
    method: context.method,
    url: context.url,
    timestamp: context.timestamp,
    userAgent: context.userAgent,
    ip: context.ip,
    userId: context.userId
  };
}