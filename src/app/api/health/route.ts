import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check basic application health
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {
        database: 'unknown',
        firebase: 'unknown',
        monitoring: 'unknown'
      }
    };

    // Check Firebase connection
    try {
      // Simple Firestore query to test connection
      const testQuery = await db.collection('_health_check').limit(1).get();
      health.checks.database = 'healthy';
      health.checks.firebase = 'healthy';
    } catch (error) {
      health.checks.database = 'unhealthy';
      health.checks.firebase = 'unhealthy';
      health.status = 'degraded';
    }

    // Check monitoring services
    const monitoringServices = {
      sentry: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      analytics: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
      mixpanel: !!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
    };

    health.checks.monitoring = Object.values(monitoringServices).every(Boolean) ? 'healthy' : 'degraded';

    // Calculate response time
    const responseTime = Date.now() - startTime;
    health.responseTime = responseTime;

    // Determine overall status
    if (health.checks.database === 'unhealthy' || health.checks.firebase === 'unhealthy') {
      health.status = 'unhealthy';
    } else if (health.checks.monitoring === 'unhealthy') {
      health.status = 'degraded';
    }

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });

  } catch (error) {
    // Critical error - return 503
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

// Detailed health check for monitoring systems
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { detailed = false } = body;

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {
        database: { status: 'unknown', details: {} },
        firebase: { status: 'unknown', details: {} },
        monitoring: { status: 'unknown', details: {} },
        performance: { status: 'unknown', details: {} }
      }
    };

    // Detailed database check
    if (detailed) {
      try {
        const startDb = Date.now();
        const testQuery = await db.collection('_health_check').limit(1).get();
        const dbResponseTime = Date.now() - startDb;
        
        health.checks.database = {
          status: 'healthy',
          details: {
            responseTime: dbResponseTime,
            collections: testQuery.empty ? 0 : 1,
            timestamp: new Date().toISOString()
          }
        };
        health.checks.firebase = {
          status: 'healthy',
          details: {
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        health.checks.database = {
          status: 'unhealthy',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        };
        health.checks.firebase = {
          status: 'unhealthy',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        };
        health.status = 'unhealthy';
      }
    }

    // Detailed monitoring check
    if (detailed) {
      const monitoringDetails = {
        sentry: {
          configured: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ? 'configured' : 'not configured'
        },
        analytics: {
          configured: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
          measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'not configured'
        },
        mixpanel: {
          configured: !!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
          token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ? 'configured' : 'not configured'
        }
      };

      const allConfigured = Object.values(monitoringDetails).every(service => service.configured);
      
      health.checks.monitoring = {
        status: allConfigured ? 'healthy' : 'degraded',
        details: monitoringDetails
      };
    }

    // Performance metrics
    if (detailed) {
      const performanceMetrics = {
        responseTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      };

      health.checks.performance = {
        status: 'healthy',
        details: performanceMetrics
      };
    }

    // Calculate overall response time
    health.responseTime = Date.now() - startTime;

    // Determine overall status
    const allHealthy = Object.values(health.checks).every(check => 
      typeof check === 'string' ? check === 'healthy' : check.status === 'healthy'
    );
    
    const anyUnhealthy = Object.values(health.checks).some(check => 
      typeof check === 'string' ? check === 'unhealthy' : check.status === 'unhealthy'
    );

    if (anyUnhealthy) {
      health.status = 'unhealthy';
    } else if (!allHealthy) {
      health.status = 'degraded';
    }

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });

  } catch (error) {
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}
