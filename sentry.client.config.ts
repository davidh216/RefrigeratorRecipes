import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  
  // Environment
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  
  // Release tracking
  release: process.env.npm_package_version,
  
  // Debug mode
  debug: process.env.NODE_ENV === 'development',
  
  // Before send hook to filter sensitive data
  beforeSend(event, hint) {
    // Filter out demo mode errors
    if (event.message?.includes('demo mode')) {
      return null;
    }
    
    // Remove sensitive data from error context
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    
    return event;
  },
  
  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});
