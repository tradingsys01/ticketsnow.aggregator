# Deployment Summary: Comprehensive Cron Sync

## Overview

Complete cron job implementation for kids.ticketsnow.co.il production server.
All data sources (Bravo, Google Search, YouTube) are synchronized daily with intelligent caching and quota management.

## What's Been Created

### 1. Core Service (`src/services/sync.service.ts`)
Orchestrates all 4 sync steps:
- ✅ Event sync from Bravo JSON
- ✅ Competitor search with quota management
- ✅ YouTube video search with priority queue
- ✅ YouTube comments pulling for upcoming events

### 2. Updated API Endpoint (`src/app/api/cron/daily-sync/route.ts`)
- Now calls comprehensive sync service
- Returns detailed stats for all 4 steps
- Maintains backward compatibility with Vercel cron

### 3. Production Scripts (`scripts/`)
- `cron-sync-events.sh` - Enhanced with full logging and JSON parsing
- `crontab-production.txt` - Production crontab configuration
- `deploy-cron.sh` - Automated deployment script
- `README.md` - Complete deployment documentation

### 4. Documentation
- `CRON_SYNC_ALGORITHM.md` - Detailed technical specification
- `DEPLOYMENT_SUMMARY.md` - This file
- Updated `scripts/README.md` - Deployment guide

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   DAILY CRON (02:00 UTC)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────────┐
    │  GET /api/cron/daily-sync                         │
    │  Authorization: Bearer <CRON_SECRET>              │
    └───────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────────┐
    │  runDailySync() - Comprehensive Sync Service      │
    └───────────────────────────────────────────────────┘
                            ↓
    ┌──────────────┬──────────────┬──────────────┬──────────────┐
    ↓              ↓              ↓              ↓
┌────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ STEP 1 │   │ STEP 2   │   │ STEP 3   │   │ STEP 4   │
│ Bravo  │   │Competitor│   │ YouTube  │   │ YouTube  │
│ Events │   │ Search   │   │ Videos   │   │ Comments │
└────────┘   └──────────┘   └──────────┘   └──────────┘
   ~5s          ~30s          ~60s           ~30s

                Total: ~2 minutes
```

## Step-by-Step Breakdown

### Step 1: Event Sync (Bravo JSON)
```
Source: https://bravo.ticketsnow.co.il/xml/partner/shows.json
Filter: category contains ["ילדים", "ילד", "נוער", "משפחה"]
Cache: None (always fresh)
Output: Events upserted to database
```

### Step 2: Competitor Search (Google Custom Search)
```
Quota: 100 queries/day (4 competitors × 25 events max)
Priority:
  P1: Events 0-7 days away (no cache)
  P2: Events 8-14 days away (no cache)
  P3: Events 15-30 days away (never searched)
Cache: 7 days
Competitors: Ticketmaster, Eventim, Eventer, Leaan
```

### Step 3: YouTube Video Search
```
Quota: 10,000 units/day (~100 video searches)
Priority:
  P1: Events < 14 days (no cache)
  P2: New events (never searched)
  P3: Expired cache (> 24h)
Cache: 24 hours
Strategy:
  1. Search @ticketsnowcoil channel first
  2. Fallback to general YouTube search
  3. Filter relevant videos (no reactions/covers)
Max: 50 events per day
```

### Step 4: YouTube Comments
```
Quota: 10,000 units/day (~1000+ videos possible)
Priority: Videos for events < 7 days away
Cache: 3 days
Max Comments: 10 per video (with replies)
Max: 100 videos per day
```

## Quota Summary

| Service | Daily Quota | Expected Usage | % Used |
|---------|-------------|----------------|--------|
| Bravo JSON | Unlimited | 1 fetch | - |
| Google Custom Search | 100 queries | ~100 (25 events × 4) | 100% |
| YouTube Search | 10,000 units | ~5,000 (50 × 100) | 50% |
| YouTube Comments | 10,000 units | ~100 (100 × 1) | 1% |

**Total YouTube Usage:** ~5,100 / 10,000 units (51%)

## Cache Strategy

| Data Type | Duration | Rationale |
|-----------|----------|-----------|
| Events | No cache | Source of truth |
| Competitors | 7 days | Ticket sites rarely change |
| YouTube Videos | 24 hours | New videos may appear |
| Comments | 3 days | Comments update frequently |

## Monitoring Endpoints

### 1. Status Endpoint
```bash
GET /api/cron/status
```
Returns:
- Last sync results
- Daily quota usage
- Recent sync history (last 10)
- Database statistics
- Success rate

### 2. Daily Sync Endpoint (Protected)
```bash
GET /api/cron/daily-sync
Authorization: Bearer <CRON_SECRET>
```
Returns:
- Complete sync results
- Stats for all 4 steps
- Duration
- Errors (if any)

## Log Files

Production logs location: `/home/appuser/apps/kids.ticketsnow.co.il/logs/`

### Daily Sync Logs
```
cron-sync-YYYYMMDD.log  # Daily sync with full stats
cron.log                # Combined cron output
cleanup.log             # Log rotation output
```

### Log Format (with jq)
```
[2024-01-15T02:00:00Z] ========================================
[2024-01-15T02:00:00Z] Starting comprehensive daily sync...
[2024-01-15T02:00:00Z] ========================================
[2024-01-15T02:00:00Z] HTTP Status: 200
[2024-01-15T02:00:00Z] Response Body:
{
  "success": true,
  "duration": "125.34s",
  "eventSync": { "total": 145, "new": 12, "updated": 23, "removed": 3 },
  "competitorSearch": { "processed": 25, "queriesUsed": 100, "remaining": 0 },
  "youtubeVideos": { "eventsProcessed": 47, "videosFound": 142 },
  "youtubeComments": { "videosProcessed": 89, "commentsFetched": 523 }
}
[2024-01-15T02:00:00Z] ----------------------------------------
[2024-01-15T02:00:00Z] Sync Summary:
[2024-01-15T02:00:00Z]   Duration: 125.34s
[2024-01-15T02:00:00Z]   Events: 12 new, 23 updated, 3 removed
[2024-01-15T02:00:00Z]   Competitors: 25 events, 100 queries used
[2024-01-15T02:00:00Z]   YouTube Videos: 47 events, 142 videos found
[2024-01-15T02:00:00Z]   YouTube Comments: 89 videos, 523 comments fetched
[2024-01-15T02:00:00Z] ✅ Sync completed successfully
```

## Deployment Checklist

### Pre-Deployment
- [ ] Verify `.env` has all required keys:
  - `DATABASE_URL`
  - `GOOGLE_SERVICE_ACCOUNT_PATH`
  - `GOOGLE_SEARCH_ENGINE_ID`
  - `YOUTUBE_OAUTH_CLIENT_ID`
  - `YOUTUBE_OAUTH_CLIENT_SECRET`
  - `YOUTUBE_OAUTH_REFRESH_TOKEN`
  - `CRON_SECRET`
  - `BRAVO_JSON_URL`

### Deployment Steps
1. [ ] Run `./scripts/deploy-cron.sh prdr` to copy scripts
2. [ ] SSH to production: `ssh prdr`
3. [ ] Edit `/tmp/crontab-production.txt`:
   - Replace `REPLACE_WITH_PRODUCTION_SECRET`
   - Verify paths: `/home/appuser/apps/kids.ticketsnow.co.il`
4. [ ] Install crontab: `crontab /tmp/crontab-production.txt`
5. [ ] Verify: `crontab -l`

### Post-Deployment Testing
1. [ ] Manual test run:
   ```bash
   ssh prdr
   SITE_URL=https://kids.ticketsnow.co.il \
   CRON_SECRET=<your-secret> \
   /home/appuser/apps/kids.ticketsnow.co.il/scripts/cron-sync-events.sh
   ```

2. [ ] Check logs:
   ```bash
   tail -f /home/appuser/apps/kids.ticketsnow.co.il/logs/cron-sync-$(date +%Y%m%d).log
   ```

3. [ ] Verify API response:
   ```bash
   curl -H "Authorization: Bearer <your-secret>" \
     https://kids.ticketsnow.co.il/api/cron/daily-sync | jq '.'
   ```

4. [ ] Check status endpoint (public):
   ```bash
   curl https://kids.ticketsnow.co.il/api/cron/status | jq '.'
   ```

### Monitoring
- [ ] Wait for first automated run (02:00 UTC)
- [ ] Check logs next day for success
- [ ] Monitor quota usage via `/api/cron/status`
- [ ] Verify database is being updated

## Error Handling

### Common Issues

**1. Authentication Failure (401)**
- Check `CRON_SECRET` matches in crontab and `.env`
- Verify header format: `Authorization: Bearer <secret>`

**2. Quota Exceeded (Google Search)**
- Check `/api/cron/status` for daily query count
- Wait for quota reset (midnight UTC)
- Reduce competitor search priority if needed

**3. YouTube API Errors**
- Verify OAuth tokens are valid
- Check service account has YouTube API enabled
- Monitor quota usage (10,000 units/day)

**4. Database Errors**
- Verify Prisma client is generated: `npx prisma generate`
- Check database connection string
- Ensure migrations are applied

### Rollback Plan

If issues occur:
```bash
# SSH to production
ssh prdr

# Remove crontab
crontab -r

# Or restore to simple event-only sync
# Edit crontab to only call /api/events/sync instead of /api/cron/daily-sync
```

## Performance Metrics

Expected daily performance:

```
Total Duration: ~2 minutes (125-150s)
├─ Events Sync:     5-10s
├─ Competitors:     20-40s (depends on events)
├─ YouTube Videos:  40-80s (depends on events)
└─ YouTube Comments: 20-40s (depends on videos)

Cache Hit Rate: 60-80% (after initial run)

Daily Database Changes:
├─ Events: 10-20 new/updated per day
├─ Competitors: 25 events × 4 sites = 100 matches
├─ YouTube Videos: 50 events × 2-3 videos = 100-150 videos
└─ Comments: 100 videos × 5-10 comments = 500-1000 comments
```

## Next Steps

1. **Deploy to Production**
   - Use `./scripts/deploy-cron.sh prdr`
   - Test manually before waiting for automated run

2. **Monitor First Week**
   - Check logs daily
   - Verify quota usage is sustainable
   - Adjust priorities if needed

3. **Optimization (Optional)**
   - Add Slack/email notifications on failures
   - Create dashboard for sync metrics
   - Tune cache durations based on usage patterns

## Support

- **Documentation:** See `CRON_SYNC_ALGORITHM.md` for technical details
- **Deployment:** See `scripts/README.md` for deployment guide
- **Monitoring:** Use `/api/cron/status` for real-time metrics
- **Logs:** Check `/home/appuser/apps/kids.ticketsnow.co.il/logs/`
