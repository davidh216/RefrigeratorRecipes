# RefrigeratorRecipes Production Deployment Guide

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Pre-deployment Checklist](#pre-deployment-checklist)
3. [Deployment Process](#deployment-process)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Rollback Procedures](#rollback-procedures)
6. [Security Considerations](#security-considerations)
7. [Backup Procedures](#backup-procedures)
8. [Incident Response](#incident-response)

## Environment Setup

### 1. Environment Variables

Create environment-specific `.env` files:

#### Development (.env.local)
```bash
NODE_ENV=development
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_MONITORING=false
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
```

#### Staging (.env.staging)
```bash
NODE_ENV=staging
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_MONITORING=true
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
# Add all Firebase config variables
```

#### Production (.env.production)
```bash
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_MONITORING=true
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
# Add all Firebase config variables
```

### 2. Firebase Project Setup

1. **Create Production Firebase Project**
   ```bash
   firebase projects:create refrigerator-recipes-prod
   firebase use refrigerator-recipes-prod
   ```

2. **Enable Required Services**
   - Authentication (Email/Password, Google)
   - Firestore Database
   - Storage
   - Analytics

3. **Configure Security Rules**
   - Firestore: Restrict access to authenticated users
   - Storage: Restrict uploads to authenticated users
   - Authentication: Enable email verification

4. **Set up Backup Bucket**
   ```bash
   gsutil mb gs://refrigerator-recipes-backups
   gsutil iam ch serviceAccount:firebase-adminsdk-xxxxx@refrigerator-recipes-prod.iam.gserviceaccount.com:objectAdmin gs://refrigerator-recipes-backups
   ```

### 3. Monitoring Setup

#### Sentry Configuration
1. Create Sentry project
2. Add DSN to environment variables
3. Configure alert rules for:
   - Error rate > 5%
   - Performance degradation
   - Failed transactions

#### Google Analytics
1. Create GA4 property
2. Add measurement ID to environment variables
3. Set up conversion tracking
4. Configure custom events

#### Mixpanel
1. Create Mixpanel project
2. Add token to environment variables
3. Set up funnels and cohorts

## Pre-deployment Checklist

### Code Quality
- [ ] All tests passing (`npm run test:ci`)
- [ ] TypeScript compilation successful (`npm run type-check`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Security audit clean (`npm run security-audit`)
- [ ] Bundle analysis completed (`npm run analyze`)

### Environment
- [ ] Environment variables configured
- [ ] Firebase project set up
- [ ] Database migrations applied
- [ ] Backup procedures tested
- [ ] Monitoring tools configured

### Security
- [ ] Security headers configured
- [ ] CSP policies implemented
- [ ] Rate limiting configured
- [ ] Input validation implemented
- [ ] Authentication flows tested

### Performance
- [ ] Lighthouse scores > 90
- [ ] Bundle size optimized
- [ ] Image optimization enabled
- [ ] Caching strategies implemented
- [ ] CDN configured

## Deployment Process

### 1. Staging Deployment

```bash
# Build staging version
npm run build:staging

# Deploy to staging
npm run deploy:staging

# Run smoke tests
npm run test:smoke

# Verify monitoring
npm run verify:monitoring
```

### 2. Production Deployment

```bash
# Create production build
npm run build:production

# Deploy with zero-downtime
npm run deploy:production

# Verify deployment
npm run verify:deployment

# Monitor for issues
npm run monitor:deployment
```

### 3. Post-deployment Verification

- [ ] Application accessible
- [ ] Authentication working
- [ ] Database connections stable
- [ ] Monitoring data flowing
- [ ] Analytics tracking
- [ ] Performance metrics normal

## Monitoring & Alerting

### Key Metrics to Monitor

#### Application Metrics
- Response time (p95 < 2s)
- Error rate (< 1%)
- Throughput (requests/second)
- Memory usage (< 80%)
- CPU usage (< 70%)

#### Business Metrics
- User registrations
- Recipe creations
- Meal plan usage
- Shopping list usage
- User retention

#### Infrastructure Metrics
- Firebase quota usage
- Storage usage
- Database performance
- CDN hit rates

### Alert Configuration

#### Critical Alerts (Immediate Response)
- Application down
- Error rate > 5%
- Authentication failures
- Database connection issues

#### Warning Alerts (Within 1 hour)
- Response time > 3s
- Memory usage > 85%
- Storage usage > 80%
- Unusual traffic patterns

#### Info Alerts (Within 4 hours)
- New feature usage
- Performance degradation
- Backup failures

## Rollback Procedures

### 1. Quick Rollback (5 minutes)
```bash
# Revert to previous deployment
npm run rollback:quick

# Verify rollback
npm run verify:rollback
```

### 2. Full Rollback (15 minutes)
```bash
# Restore from backup
npm run rollback:full

# Restore database state
npm run restore:database

# Verify system integrity
npm run verify:integrity
```

### 3. Emergency Rollback (2 minutes)
```bash
# Emergency shutdown
npm run emergency:shutdown

# Restore from last known good state
npm run emergency:restore
```

## Security Considerations

### 1. Environment Security
- Use environment-specific Firebase projects
- Implement proper IAM roles
- Enable audit logging
- Regular security scans

### 2. Application Security
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- XSS protection
- CSRF protection

### 3. Data Security
- Encrypt data at rest
- Encrypt data in transit
- Regular security audits
- GDPR compliance

### 4. Access Control
- Principle of least privilege
- Regular access reviews
- Multi-factor authentication
- Session management

## Backup Procedures

### 1. Automated Backups
```bash
# Daily backup (automated)
0 2 * * * /usr/bin/node /path/to/firebase-backup.js backup-all

# Weekly backup (automated)
0 3 * * 0 /usr/bin/node /path/to/firebase-backup.js backup-all
```

### 2. Manual Backups
```bash
# Full backup
node firebase-backup.js backup-all

# Collection-specific backup
node firebase-backup.js backup-collection recipes

# List available backups
node firebase-backup.js list
```

### 3. Backup Verification
- Test restore procedures monthly
- Verify backup integrity
- Monitor backup success rates
- Alert on backup failures

## Incident Response

### 1. Incident Classification

#### P0 - Critical (Immediate Response)
- Application completely down
- Data loss or corruption
- Security breach
- Complete service outage

#### P1 - High (Within 1 hour)
- Major feature broken
- Performance degradation
- Partial service outage
- Data inconsistency

#### P2 - Medium (Within 4 hours)
- Minor feature issues
- UI/UX problems
- Performance issues
- Monitoring alerts

#### P3 - Low (Within 24 hours)
- Documentation updates
- Minor bugs
- Enhancement requests

### 2. Response Procedures

#### Immediate Response (P0/P1)
1. **Assess** - Determine scope and impact
2. **Communicate** - Notify stakeholders
3. **Mitigate** - Implement immediate fixes
4. **Investigate** - Root cause analysis
5. **Resolve** - Permanent solution
6. **Review** - Post-incident analysis

#### Escalation Matrix
- **On-call Engineer** (0-30 minutes)
- **Senior Engineer** (30-60 minutes)
- **Engineering Manager** (60-120 minutes)
- **CTO** (120+ minutes)

### 3. Communication Plan

#### Internal Communication
- Slack channels: #alerts, #incidents
- Email notifications
- Status page updates
- Team notifications

#### External Communication
- Status page updates
- Customer notifications
- Social media updates
- Press releases (if necessary)

### 4. Post-Incident Review

#### Review Meeting (Within 48 hours)
- Timeline reconstruction
- Root cause analysis
- Impact assessment
- Action items

#### Documentation
- Incident report
- Lessons learned
- Process improvements
- Knowledge base updates

## Deployment Scripts

### package.json Scripts
```json
{
  "scripts": {
    "deploy:staging": "vercel --env staging",
    "deploy:production": "vercel --prod",
    "rollback:quick": "vercel rollback",
    "verify:deployment": "npm run test:smoke",
    "monitor:deployment": "npm run check:health",
    "emergency:shutdown": "vercel --prod --force",
    "emergency:restore": "vercel rollback --prod"
  }
}
```

### Health Check Endpoint
```typescript
// pages/api/health.ts
export default function handler(req, res) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT
  };
  
  res.status(200).json(health);
}
```

## Maintenance Procedures

### 1. Regular Maintenance
- Weekly dependency updates
- Monthly security patches
- Quarterly performance reviews
- Annual architecture reviews

### 2. Database Maintenance
- Daily backups
- Weekly performance optimization
- Monthly data cleanup
- Quarterly schema reviews

### 3. Infrastructure Maintenance
- Monthly security updates
- Quarterly capacity planning
- Annual disaster recovery tests
- Continuous monitoring optimization

---

## Quick Reference

### Emergency Contacts
- **On-call Engineer**: [Contact Info]
- **Senior Engineer**: [Contact Info]
- **Engineering Manager**: [Contact Info]
- **CTO**: [Contact Info]

### Useful Commands
```bash
# Check application health
curl https://your-app.vercel.app/api/health

# View logs
vercel logs

# Check deployment status
vercel ls

# Rollback deployment
vercel rollback
```

### Monitoring URLs
- **Sentry**: https://sentry.io/organizations/your-org/projects/
- **Google Analytics**: https://analytics.google.com/
- **Mixpanel**: https://mixpanel.com/report/
- **Status Page**: https://status.your-app.com/
