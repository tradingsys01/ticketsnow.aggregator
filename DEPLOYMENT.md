# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Required
DATABASE_URL="<production-postgres-url>"
CRON_SECRET="<generate-with-openssl-rand-base64-32>"
NEXT_PUBLIC_SITE_URL="https://kids.ticketsnow.co.il"

# Google Custom Search
GOOGLE_SERVICE_ACCOUNT_PATH="./google-service-account.json"
GOOGLE_SEARCH_ENGINE_ID="57449a0fcc522472f"

# Optional
YOUTUBE_API_KEY="<youtube-api-key>"

# Source Data
BRAVO_JSON_URL="https://bravo.ticketsnow.co.il/xml/partner/shows.json"
```

### 2. Generate Production Secrets

```bash
# Generate CRON_SECRET
openssl rand -base64 32

# Example output: Kj7x9pQmN4vL2wR8tY6uI1oE3sA5gH0z...
```

### 3. Upload Google Service Account

Ensure `google-service-account.json` is in project root and will be deployed.

### 4. Database Setup

If using PostgreSQL (recommended for production):

```bash
# Update DATABASE_URL in .env
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed database (first time only)
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://kids.ticketsnow.co.il/api/cron/daily-sync
```

## Deployment Steps

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option 2: Deploy via Git Integration

```bash
# Commit all changes
git add .
git commit -m "Production deployment"

# Push to main branch
git push origin main

# Vercel will auto-deploy
```

## Post-Deployment Verification

### 1. Check Homepage

```bash
curl https://kids.ticketsnow.co.il/
```

**Expected**: HTML with Hebrew event listings

### 2. Check Cron Status

```bash
curl https://kids.ticketsnow.co.il/api/cron/status
```

**Expected**:
```json
{
  "systemStatus": "healthy",
  "database": {
    "totalEvents": 141,
    "upcomingEvents": 126
  },
  "quota": {...}
}
```

### 3. Test Event Detail Page

Visit: `https://kids.ticketsnow.co.il/event/<any-event-slug>`

**Expected**: Event details with images, venue, date, competitor links

### 4. Verify Sitemap

```bash
curl https://kids.ticketsnow.co.il/sitemap.xml
```

**Expected**: XML with all event URLs

### 5. Test Cron Job

```bash
curl -X POST \
  -H "Authorization: Bearer <CRON_SECRET>" \
  https://kids.ticketsnow.co.il/api/cron/daily-sync
```

**Expected**:
```json
{
  "success": true,
  "duration": "80.65s",
  "eventSync": {...},
  "competitorSearch": {...}
}
```

## Monitoring Setup

### 1. Vercel Dashboard Monitoring

1. Go to Vercel Dashboard → Your Project
2. Navigate to "Cron Jobs" tab
3. Verify schedule: "0 2 * * *" (Daily at 2:00 AM)
4. Check execution history

### 2. Set Up Failure Notifications

1. Vercel Dashboard → Settings → Notifications
2. Enable "Cron Job Failures"
3. Add notification channels:
   - Email
   - Slack webhook
   - Discord webhook

### 3. Create Status Monitoring Cron

Add to your monitoring tool (e.g., UptimeRobot):

- **URL**: `https://kids.ticketsnow.co.il/api/cron/status`
- **Interval**: Every 5 minutes
- **Alert if**: Response time > 5s OR status != 200

### 4. Log Monitoring

In Vercel Dashboard → Logs, set up filters:
- **Error logs**: Filter for "❌" or "error"
- **Sync logs**: Filter for "🚀 Starting daily sync"
- **Quota warnings**: Filter for "quota exceeded"

## Cron Job Configuration

Current schedule in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-sync",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**To change schedule**:

```json
{
  "schedule": "0 */6 * * *"  // Every 6 hours
}
{
  "schedule": "0 0 * * 0"    // Every Sunday at midnight
}
{
  "schedule": "*/15 * * * *" // Every 15 minutes (not recommended)
}
```

## Troubleshooting

### Cron Job Not Running

**Check**:
1. Vercel Dashboard → Cron Jobs → Execution history
2. Verify `vercel.json` is deployed
3. Check environment variable `CRON_SECRET` is set

**Solution**:
```bash
# Redeploy
vercel --prod --force

# Or trigger manually
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://kids.ticketsnow.co.il/api/cron/daily-sync
```

### "Unauthorized" Error

**Problem**: CRON_SECRET mismatch

**Solution**:
1. Check Vercel environment variables
2. Regenerate secret:
   ```bash
   openssl rand -base64 32
   ```
3. Update in Vercel Dashboard
4. Redeploy

### Database Connection Errors

**Problem**: DATABASE_URL incorrect or database not accessible

**Solution**:
1. Verify DATABASE_URL format:
   ```
   postgresql://user:password@host:5432/dbname?schema=public
   ```
2. Check database is running and accessible
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Google API Quota Exceeded

**Problem**: Too many competitor searches

**Solution**:
1. Check daily usage:
   ```bash
   curl https://kids.ticketsnow.co.il/api/cron/status
   ```
2. View `quota.dailyQueryCount`
3. Options:
   - Wait for quota reset (midnight PT)
   - Increase cache TTL in `competitor.service.ts`
   - Reduce priority threshold (30 days → 14 days)
   - Add multiple API keys

### Events Not Showing

**Problem**: Bravo API down or data format changed

**Solution**:
1. Test Bravo API:
   ```bash
   curl https://bravo.ticketsnow.co.il/xml/partner/shows.json
   ```
2. Check logs in Vercel Dashboard
3. Review `events.service.ts` for API changes
4. Manual sync:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://kids.ticketsnow.co.il/api/cron/daily-sync
   ```

## Performance Optimization

### 1. Enable ISR (Incremental Static Regeneration)

Add to event pages:

```typescript
// src/app/event/[slug]/page.tsx
export const revalidate = 3600 // Revalidate every hour
```

### 2. Image Optimization

Already using Next.js Image component with automatic optimization.

### 3. Database Indexing

Already indexed in Prisma schema:
- Event.slug (unique index)
- Event.date (for sorting)
- CompetitorMatch.eventId + competitorName (compound index)

### 4. Caching Strategy

- **Static Generation**: All event pages pre-rendered at build
- **Competitor Matches**: Cached for 7 days
- **CDN**: Vercel Edge Network caches static assets

## Security Checklist

- ✅ CRON_SECRET in environment variables (not in code)
- ✅ Database credentials in environment variables
- ✅ Google service account not committed to git
- ✅ API authentication on sensitive endpoints
- ✅ No sensitive data in client-side code
- ✅ HTTPS enforced (Vercel default)

## Backup & Recovery

### Database Backups

If using Vercel Postgres:
- Automatic daily backups
- Point-in-time recovery available
- Retention: 7 days (Hobby), 30 days (Pro)

If using external database:
- Set up automated backups
- Test restore procedure
- Keep backups for 30+ days

### Manual Backup

```bash
# Export database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20250122.sql
```

### Sync Log Recovery

If sync logs are lost:
```bash
# Trigger fresh sync
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://kids.ticketsnow.co.il/api/cron/daily-sync
```

## Rollback Procedure

If deployment fails:

```bash
# Option 1: Revert via Vercel Dashboard
# Deployments → Previous deployment → Promote to Production

# Option 2: Revert via Git
git revert HEAD
git push origin main

# Option 3: Redeploy previous commit
vercel --prod --force
```

## Monitoring Checklist

Daily (automated):
- ✅ Cron job execution status
- ✅ Event sync success/failure
- ✅ Quota usage percentage
- ✅ Error logs

Weekly (manual):
- ✅ Review sync success rate
- ✅ Check database size
- ✅ Verify event count matches Bravo
- ✅ Review competitor match quality

Monthly (manual):
- ✅ Review performance metrics
- ✅ Check for outdated dependencies
- ✅ Audit security vulnerabilities
- ✅ Review and clean old logs

## Support Contacts

- **Vercel Support**: https://vercel.com/support
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Google Cloud Support**: https://cloud.google.com/support

## Additional Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/production-best-practices)

---

**Ready for Production** ✓

For questions or issues, check:
1. Vercel Dashboard logs
2. `/api/cron/status` endpoint
3. Phase completion docs (PHASE_8_COMPLETED.md, PHASE_9_COMPLETED.md)
