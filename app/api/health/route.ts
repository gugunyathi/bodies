// Health check endpoint for monitoring and load balancers

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/mongodb';
import { logger } from '../../../lib/logger';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      usage: {
        used: number;
        total: number;
        percentage: number;
      };
    };
    disk?: {
      status: 'healthy' | 'unhealthy';
      usage?: {
        used: number;
        total: number;
        percentage: number;
      };
    };
  };
  checks: {
    name: string;
    status: 'pass' | 'fail';
    time: string;
    output?: string;
  }[];
}

// Simple uptime tracking
const startTime = Date.now();

const checkDatabase = async (): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number; error?: string }> => {
  try {
    const start = Date.now();
    const db = await getDatabase();
    
    // Simple ping to check database connectivity
    await db.admin().ping();
    
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    logger.error('Database health check failed', error instanceof Error ? error : new Error(String(error)));
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkMemory(): { status: 'healthy' | 'unhealthy'; usage: { used: number; total: number; percentage: number } } {
  const memUsage = process.memoryUsage();
  const totalMemory = memUsage.heapTotal;
  const usedMemory = memUsage.heapUsed;
  const percentage = (usedMemory / totalMemory) * 100;
  
  return {
    status: percentage > 90 ? 'unhealthy' : 'healthy',
    usage: {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round(percentage * 100) / 100,
    },
  };
}

function getOverallStatus(services: HealthStatus['services']): 'healthy' | 'unhealthy' | 'degraded' {
  const statuses = Object.values(services).map(service => service.status);
  
  if (statuses.every(status => status === 'healthy')) {
    return 'healthy';
  }
  
  if (statuses.some(status => status === 'unhealthy')) {
    // If database is unhealthy, the whole system is unhealthy
    if (services.database.status === 'unhealthy') {
      return 'unhealthy';
    }
    // Otherwise, it's degraded
    return 'degraded';
  }
  
  return 'degraded';
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Perform health checks
    const [databaseCheck, memoryCheck] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkMemory()),
    ]);
    
    const services = {
      database: databaseCheck,
      memory: memoryCheck,
    };
    
    const overallStatus = getOverallStatus(services);
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      checks: [
        {
          name: 'database_connectivity',
          status: databaseCheck.status === 'healthy' ? 'pass' : 'fail',
          time: new Date().toISOString(),
          output: databaseCheck.error || `Response time: ${databaseCheck.responseTime}ms`,
        },
        {
          name: 'memory_usage',
          status: memoryCheck.status === 'healthy' ? 'pass' : 'fail',
          time: new Date().toISOString(),
          output: `Memory usage: ${memoryCheck.usage.percentage}%`,
        },
      ],
    };
    
    const responseTime = Date.now() - startTime;
    
    // Log health check (only if unhealthy to avoid spam)
    if (overallStatus !== 'healthy') {
      logger.warn('Health check failed', {
        status: overallStatus,
        services,
        responseTime,
      });
    }
    
    // Return appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json(healthStatus, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Response-Time': `${responseTime}ms`,
      },
    });
    
  } catch (error) {
    logger.error('Health check endpoint error', error instanceof Error ? error : new Error(String(error)));
    
    const errorResponse: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: { status: 'unhealthy', error: 'Health check failed' },
        memory: { status: 'unhealthy', usage: { used: 0, total: 0, percentage: 0 } },
      },
      checks: [
        {
          name: 'health_check_endpoint',
          status: 'fail',
          time: new Date().toISOString(),
          output: error instanceof Error ? error.message : String(error),
        },
      ],
    };
    
    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}

// Simple liveness probe (for Kubernetes)
export async function HEAD(request: NextRequest) {
  try {
    // Quick check - just verify the process is running
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}

// Readiness probe - more thorough check
export async function POST(request: NextRequest) {
  try {
    // Check if the application is ready to serve traffic
    const databaseCheck = await checkDatabase();
    
    if (databaseCheck.status === 'unhealthy') {
      return NextResponse.json(
        { status: 'not_ready', reason: 'database_unavailable' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { status: 'ready', timestamp: new Date().toISOString() },
      { status: 200 }
    );
    
  } catch (error) {
    return NextResponse.json(
      { status: 'not_ready', reason: 'internal_error' },
      { status: 503 }
    );
  }
}

// Health check functions are used internally only