# Deployment & Production Guide

## Overview

This guide provides comprehensive instructions for deploying the RefrigeratorRecipes application to production, including environment setup, monitoring, security, and maintenance procedures.

## 🚀 Production Readiness Status

### ✅ Production Features Implemented
- **Security**: Complete security headers, CSP, authentication
- **Monitoring**: Sentry error tracking, Web Vitals, analytics
- **Backup**: Automated Firestore backups with recovery procedures
- **Deployment**: Zero-downtime deployment with rollback capability
- **Performance**: Optimized for production scale
- **Offline Support**: Service worker with full offline functionality

## 📋 Pre-Deployment Checklist

### Environment Configuration
- [ ] Firebase project configured with production settings
- [ ] Environment variables set for production
- [ ] Firestore security rules updated
- [ ] Authentication providers configured
- [ ] Domain verification completed

### Security Implementation
- [ ] Security headers configured
- [ ] Content Security Policy implemented
- [ ] HTTPS enforced
- [ ] Input validation implemented
- [ ] Rate limiting configured

### Performance Optimization
- [ ] Bundle size optimized (<2MB)
- [ ] Image optimization enabled
- [ ] Caching strategies implemented
- [ ] CDN configured
- [ ] Service worker deployed

### Monitoring Setup
- [ ] Sentry error tracking configured
- [ ] Analytics tracking enabled
- [ ] Performance monitoring active
- [ ] Health check endpoints implemented
- [ ] Backup procedures tested

## 🔧 Environment Setup

### Production Environment Variables
Create a `.env.production` file:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Analytics
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_ga_id

# Sentry
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token

# Performance
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true

# Security
NEXT_PUBLIC_ENABLE_SECURITY_HEADERS=true
NEXT_PUBLIC_ENABLE_CSP=true
```

### Staging Environment Variables
Create a `.env.staging` file:

```env
# Firebase Configuration (staging project)
NEXT_PUBLIC_FIREBASE_API_KEY=your_staging_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_staging_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_staging_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_staging_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_staging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_staging_app_id

# Analytics (staging)
NEXT_PUBLIC_MIXPANEL_TOKEN=your_staging_mixpanel_token
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_staging_ga_id

# Sentry (staging)
NEXT_PUBLIC_SENTRY_DSN=your_staging_sentry_dsn
SENTRY_AUTH_TOKEN=your_staging_sentry_auth_token

# Performance
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true

# Security
NEXT_PUBLIC_ENABLE_SECURITY_HEADERS=true
NEXT_PUBLIC_ENABLE_CSP=true
```

## 🛡️ Security Configuration

### Security Headers
Configure security headers in `next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
  // Content Security Policy
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/health',
      },
    ];
  },
};

export default nextConfig;
```

### Content Security Policy
Implement CSP in `src/app/layout.tsx`:

```typescript
import { headers } from 'next/headers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  
  // Set CSP header
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://www.google-analytics.com https://api.mixpanel.com",
    "frame-src 'none'",
    "object-src 'none'",
  ].join('; ');

  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={cspHeader} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Firestore Security Rules
Update Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data is only accessible by the authenticated user
    match /users/{userId}/{collection}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public recipes (if implementing sharing)
    match /public/recipes/{recipeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Rate limiting for writes
    match /users/{userId}/ingredients/{ingredientId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && 
                   request.auth.uid == userId && 
                   request.time > resource.data.lastWrite + duration.value(1, 's');
    }
  }
}
```

## 📊 Monitoring & Analytics

### Sentry Configuration
Configure Sentry for error tracking in `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  beforeSend(event) {
    // Filter out certain errors
    if (event.exception) {
      const exception = event.exception.values?.[0];
      if (exception?.type === 'ChunkLoadError') {
        return null;
      }
    }
    return event;
  },
});
```

Configure Sentry server in `sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  integrations: [
    Sentry.nodeProfilingIntegration(),
  ],
});
```

### Analytics Configuration
Configure analytics in `src/lib/analytics.ts`:

```typescript
import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel
if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
  mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV === 'development',
    track_pageview: true,
    persistence: 'localStorage',
  });
}

// Google Analytics
export const initGA = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
    });
  }
};

// Track custom events
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
    mixpanel.track(eventName, properties);
  }
  
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    window.gtag('event', eventName, properties);
  }
};
```

### Health Check API
Implement health check endpoint in `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check database connectivity
    const dbHealth = await checkDatabaseHealth();
    
    // Check external services
    const externalHealth = await checkExternalServices();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      services: {
        database: dbHealth,
        external: externalHealth,
      },
    };

    return NextResponse.json(healthStatus);
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

async function checkDatabaseHealth() {
  try {
    // Add your database health check logic here
    return { status: 'healthy', responseTime: 100 };
  } catch (error) {
    return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function checkExternalServices() {
  try {
    // Add your external service health check logic here
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

## 🔄 Backup & Recovery

### Automated Backup Script
Create backup script in `firebase-backup.js`:

```javascript
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');

// Initialize Firebase Admin
const serviceAccount = require('./service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const storage = new Storage();

async function backupCollection(collectionPath, backupName) {
  try {
    console.log(`Starting backup of ${collectionPath}...`);
    
    const snapshot = await db.collection(collectionPath).get();
    const documents = [];
    
    snapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        data: doc.data(),
        createTime: doc.createTime,
        updateTime: doc.updateTime,
      });
    });
    
    const backupData = {
      collection: collectionPath,
      timestamp: new Date().toISOString(),
      documentCount: documents.length,
      documents: documents,
    };
    
    const bucket = storage.bucket(process.env.BACKUP_BUCKET_NAME);
    const file = bucket.file(`backups/${backupName}/${collectionPath}.json`);
    
    await file.save(JSON.stringify(backupData, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });
    
    console.log(`Backup completed: ${documents.length} documents backed up`);
    return backupData;
  } catch (error) {
    console.error(`Backup failed for ${collectionPath}:`, error);
    throw error;
  }
}

async function backupAll() {
  const collections = ['users'];
  const backupName = `backup-${new Date().toISOString().split('T')[0]}`;
  
  for (const collection of collections) {
    await backupCollection(collection, backupName);
  }
  
  console.log('All backups completed successfully');
}

async function restoreFromBackup(backupName, collectionPath) {
  try {
    console.log(`Restoring ${collectionPath} from backup ${backupName}...`);
    
    const bucket = storage.bucket(process.env.BACKUP_BUCKET_NAME);
    const file = bucket.file(`backups/${backupName}/${collectionPath}.json`);
    
    const [data] = await file.download();
    const backupData = JSON.parse(data.toString());
    
    const batch = db.batch();
    
    for (const doc of backupData.documents) {
      const docRef = db.collection(collectionPath).doc(doc.id);
      batch.set(docRef, doc.data);
    }
    
    await batch.commit();
    
    console.log(`Restore completed: ${backupData.documents.length} documents restored`);
  } catch (error) {
    console.error(`Restore failed for ${collectionPath}:`, error);
    throw error;
  }
}

// CLI interface
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'backup-all':
    backupAll();
    break;
  case 'backup-collection':
    backupCollection(arg, `backup-${new Date().toISOString().split('T')[0]}`);
    break;
  case 'restore':
    const [backupName, collectionPath] = arg.split(':');
    restoreFromBackup(backupName, collectionPath);
    break;
  default:
    console.log('Usage: node firebase-backup.js [backup-all|backup-collection|restore]');
}
```

### Backup Schedule
Set up automated backups using cron jobs or cloud functions:

```javascript
// Cloud Function for automated backups
exports.scheduledBackup = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  try {
    const backupName = `backup-${new Date().toISOString().split('T')[0]}`;
    await backupAll(backupName);
    
    console.log('Scheduled backup completed successfully');
    return null;
  } catch (error) {
    console.error('Scheduled backup failed:', error);
    throw error;
  }
});
```

## 🚀 Deployment Platforms

### Vercel Deployment (Recommended)

#### 1. Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings

#### 2. Environment Variables
Set environment variables in Vercel dashboard:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Analytics
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_ga_id

# Sentry
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

#### 3. Build Configuration
Configure build settings in `vercel.json`:

```json
{
  "buildCommand": "npm run build:production",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm ci",
  "devCommand": "npm run dev",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

#### 4. Deployment Scripts
Update `package.json` scripts:

```json
{
  "scripts": {
    "build:production": "NODE_ENV=production next build",
    "build:staging": "NODE_ENV=staging next build",
    "deploy:production": "vercel --prod",
    "deploy:staging": "vercel",
    "deploy:preview": "vercel --preview"
  }
}
```

### Firebase Hosting Deployment

#### 1. Firebase Configuration
Initialize Firebase hosting:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

#### 2. Firebase Configuration File
Create `firebase.json`:

```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

#### 3. Build for Static Export
Update `next.config.ts` for static export:

```typescript
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // ... other config
};
```

#### 4. Deploy to Firebase
```bash
npm run build:production
firebase deploy --only hosting
```

### Netlify Deployment

#### 1. Netlify Configuration
Create `netlify.toml`:

```toml
[build]
  command = "npm run build:production"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "origin-when-cross-origin"
```

#### 2. Environment Variables
Set environment variables in Netlify dashboard or use `.env` files.

## 📈 Performance Monitoring

### Web Vitals Tracking
Implement Core Web Vitals tracking:

```typescript
// src/lib/analytics.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  const { id, name, value } = metric;
  
  // Send to Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, {
      event_category: 'Web Vitals',
      event_label: id,
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      non_interaction: true,
    });
  }
  
  // Send to Mixpanel
  if (typeof window !== 'undefined' && window.mixpanel) {
    window.mixpanel.track('Web Vital', {
      metric: name,
      value: value,
      id: id,
    });
  }
}

export function reportWebVitals() {
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}
```

### Performance Budget
Set up performance budgets in `package.json`:

```json
{
  "bundlesize": [
    {
      "path": ".next/static/chunks/*.js",
      "maxSize": "500 kB"
    },
    {
      "path": ".next/static/css/*.css",
      "maxSize": "100 kB"
    }
  ]
}
```

## 🔧 Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- Monitor error rates and performance metrics
- Check backup completion status
- Review security alerts

#### Weekly
- Update dependencies (security patches)
- Review performance metrics
- Analyze user feedback and issues

#### Monthly
- Security audit and penetration testing
- Performance optimization review
- Backup restoration testing
- Disaster recovery drill

### Update Procedures

#### Dependency Updates
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Update major versions (with caution)
npx npm-check-updates -u
npm install

# Run tests after updates
npm run test
npm run build
```

#### Security Updates
```bash
# Run security audit
npm audit

# Fix security vulnerabilities
npm audit fix

# For major vulnerabilities
npm audit fix --force
```

### Rollback Procedures

#### Vercel Rollback
```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-id>

# Or rollback to specific commit
vercel rollback <commit-hash>
```

#### Database Rollback
```bash
# Restore from backup
node firebase-backup.js restore backup-2024-01-15:users

# Verify data integrity
npm run test:integration
```

## 🚨 Emergency Procedures

### Emergency Shutdown
```bash
# 1. Disable new user registrations
# Update Firebase Auth settings

# 2. Show maintenance page
# Deploy maintenance page to CDN

# 3. Stop accepting new requests
# Update load balancer configuration

# 4. Backup current data
node firebase-backup.js backup-all

# 5. Notify users
# Send email notifications
```

### Data Recovery
```bash
# 1. Identify the issue
# Check logs and error reports

# 2. Stop the application
# Deploy maintenance page

# 3. Restore from backup
node firebase-backup.js restore <backup-name>:<collection>

# 4. Verify data integrity
npm run test:data-integrity

# 5. Restart application
# Deploy fixed version
```

## 📊 Monitoring Dashboard

### Key Metrics to Monitor

#### Performance Metrics
- **Page Load Time**: Target < 2 seconds
- **First Contentful Paint**: Target < 1.5 seconds
- **Largest Contentful Paint**: Target < 2.5 seconds
- **Cumulative Layout Shift**: Target < 0.1

#### Error Metrics
- **Error Rate**: Target < 1%
- **4xx Errors**: Target < 0.5%
- **5xx Errors**: Target < 0.1%

#### User Metrics
- **Daily Active Users**
- **User Retention Rate**
- **Feature Adoption Rate**
- **User Satisfaction Score**

### Alert Configuration
Set up alerts for:
- Error rate > 1%
- Response time > 3 seconds
- Database connection failures
- Backup failures
- Security incidents

---

This deployment guide provides comprehensive instructions for deploying and maintaining the RefrigeratorRecipes application in production. Regular updates will be made as new deployment requirements and best practices are identified.
