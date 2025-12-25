# Production Deployment Guide

## Platform: Custom Server (prdr)

Deployment is via SSH to the prdr server, not Vercel.

## Pre-Deployment Checklist

### 1. Environment Variables

Set these in `/home/appuser/apps/kids.ticketsnow.co.il/.env` on prdr server:

```bash
# Required
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
CRON_SECRET="<generate-with-openssl-rand-base64-32>"
NEXT_PUBLIC_SITE_URL="https://kids.ticketsnow.co.il"

# Google Custom Search
GOOGLE_SERVICE_ACCOUNT_PATH="./google-service-account.json"
GOOGLE_SEARCH_ENGINE_ID="57449a0fcc522472f"

# Optional
YOUTUBE_API_KEY="<youtube-api-key>"

# Source Data
BRAVO_JSON_URL="https://bravo.ticketsnow.co.il/xml/partner/shows.json"

# Gmail API (for email reports)
EMAIL_PROVIDER=gmail
EMAIL_FROM=gshoihet@gmail.com
EMAIL_TO=gshoihet@gmail.com
GMAIL_CLIENT_ID="<client-id>"
GMAIL_CLIENT_SECRET="<client-secret>"
GMAIL_REFRESH_TOKEN="<refresh-token>"
```

### 2. Generate Production Secrets

```bash
# Generate CRON_SECRET
openssl rand -base64 32
```

### 3. Database Setup

```bash
# SSH to production
ssh prdr

# Navigate to app directory
cd /home/appuser/apps/kids.ticketsnow.co.il

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed database (first time only)
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://kids.ticketsnow.co.il/api/cron/daily-sync
```

## Deployment Steps

### Option 1: Deploy via Script (Recommended)

```bash
# From local development machine
./scripts/deploy-to-prdr.sh
```

This script will:
1. Test SSH connection to prdr
2. Create remote directories
3. Deploy cron scripts
4. Configure crontab with Gmail reporting

### Option 2: Manual Deployment

```bash
# SSH to production
ssh prdr

# Navigate to app directory
cd /home/appuser/apps/kids.ticketsnow.co.il

# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Build for production
npm run build

# Restart the application (using PM2 or systemd)
pm2 restart kids-ticketsnow
# OR
sudo systemctl restart kids-ticketsnow
```

### Deploy Cron Jobs Only

```bash
# Copy cron script to server
scp scripts/cron-sync-events.sh prdr:/home/appuser/apps/kids.ticketsnow.co.il/scripts/

# Make executable
ssh prdr "chmod +x /home/appuser/apps/kids.ticketsnow.co.il/scripts/cron-sync-events.sh"

# Edit crontab on server
ssh prdr
crontab -e
```

Add to crontab:
```cron
# Daily sync at 02:00 UTC
0 2 * * * /home/appuser/apps/kids.ticketsnow.co.il/scripts/cron-sync-events.sh >> /home/appuser/apps/kids.ticketsnow.co.il/logs/cron.log 2>&1

# Weekly log cleanup
0 3 * * 0 find /home/appuser/apps/kids.ticketsnow.co.il/logs -name "cron-sync-*.log" -mtime +30 -delete
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

### 4. Verify Sitemap

```bash
curl https://kids.ticketsnow.co.il/sitemap.xml
```

**Expected**: XML with all event URLs using `https://kids.ticketsnow.co.il`

### 5. Test Cron Job Manually

```bash
ssh prdr
curl -X POST \
  -H "Authorization: Bearer <CRON_SECRET>" \
  https://kids.ticketsnow.co.il/api/cron/daily-sync
```

## Monitoring

### Check Logs

```bash
# SSH to server
ssh prdr

# View latest sync log
tail -f /home/appuser/apps/kids.ticketsnow.co.il/logs/cron-sync-$(date +%Y%m%d).log

# View combined cron log
tail -f /home/appuser/apps/kids.ticketsnow.co.il/logs/cron.log
```

### Log Files Location

```
/home/appuser/apps/kids.ticketsnow.co.il/logs/
├── cron-sync-YYYYMMDD.log  # Daily sync logs
├── cron.log                 # Combined cron output
└── cleanup.log              # Log rotation output
```

### Monitoring Checklist

**Daily (automated)**:
- Cron job execution status
- Event sync success/failure
- Quota usage percentage

**Weekly (manual)**:
- Review sync success rate
- Check database size
- Verify event count matches Bravo

## Troubleshooting

### Cron Job Not Running

**Check**:
```bash
ssh prdr
crontab -l | grep kids.ticketsnow
```

**Solution**:
```bash
# Reinstall crontab
./scripts/deploy-to-prdr.sh

# Or trigger manually
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://kids.ticketsnow.co.il/api/cron/daily-sync
```

### "Unauthorized" Error

**Problem**: CRON_SECRET mismatch

**Solution**:
1. Check `.env` on server: `ssh prdr && cat /home/appuser/apps/kids.ticketsnow.co.il/.env | grep CRON_SECRET`
2. Regenerate if needed: `openssl rand -base64 32`
3. Update `.env` on server
4. Restart application

### Database Connection Errors

**Solution**:
```bash
ssh prdr
cd /home/appuser/apps/kids.ticketsnow.co.il
npx prisma migrate deploy
```

### Google API Quota Exceeded

**Check**:
```bash
curl https://kids.ticketsnow.co.il/api/cron/status | jq '.quota'
```

**Solution**: Wait for quota reset (midnight PT) or adjust cache TTL

## Server Details

| Setting | Value |
|---------|-------|
| SSH Host | `prdr` |
| App Directory | `/home/appuser/apps/kids.ticketsnow.co.il` |
| Logs Directory | `/home/appuser/apps/kids.ticketsnow.co.il/logs` |
| Scripts Directory | `/home/appuser/apps/kids.ticketsnow.co.il/scripts` |
| Cron Schedule | Daily at 02:00 UTC |
| Domain | kids.ticketsnow.co.il |

## Security Checklist

- CRON_SECRET in environment variables (not in code)
- Database credentials in environment variables
- Google service account not committed to git
- API authentication on sensitive endpoints
- No sensitive data in client-side code
- HTTPS enforced

## Rollback Procedure

```bash
ssh prdr
cd /home/appuser/apps/kids.ticketsnow.co.il

# Revert to previous commit
git log --oneline -5  # Find previous commit
git checkout <commit-hash>

# Rebuild
npm run build

# Restart
pm2 restart kids-ticketsnow
```

## Support

- **Status Endpoint**: https://kids.ticketsnow.co.il/api/cron/status
- **Logs**: `ssh prdr && tail -f /home/appuser/apps/kids.ticketsnow.co.il/logs/cron.log`
- **Detailed Docs**: See `DEPLOYMENT_SUMMARY.md` and `scripts/README.md`
