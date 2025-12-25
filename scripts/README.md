# Cron Jobs Setup for Production

This directory contains scripts to deploy and manage cron jobs on the production server (PRDR).

## What Gets Synced

The daily cron job performs a **comprehensive 4-step sync**:

1. **Events from Bravo** - Fetches kids events from Bravo JSON feed
2. **Competitor Search** - Searches Google for competitor ticket sites (100 queries/day max)
3. **YouTube Videos** - Searches YouTube for event videos (prioritized by date)
4. **YouTube Comments** - Pulls comments from videos for events < 7 days away

See `CRON_SYNC_ALGORITHM.md` for complete algorithm details.

## Quick Deploy

```bash
# Deploy cron scripts to production
./scripts/deploy-cron.sh prdr
```

## Manual Setup

If you prefer to set up manually:

### 1. SSH to Production Server

```bash
ssh prdr
```

### 2. Create Directories

```bash
mkdir -p /home/appuser/apps/kids.ticketsnow.co.il/scripts
mkdir -p /home/appuser/apps/kids.ticketsnow.co.il/logs
```

### 3. Copy Cron Script

Copy `scripts/cron-sync-events.sh` to the server and make it executable:

```bash
chmod +x /home/appuser/apps/kids.ticketsnow.co.il/scripts/cron-sync-events.sh
```

### 4. Edit and Install Crontab

Edit `scripts/crontab-production.txt` locally:
- Replace `REPLACE_WITH_PRODUCTION_SECRET` with your actual `CRON_SECRET`

Then install on the server:

```bash
# Copy to server
scp scripts/crontab-production.txt prdr:/tmp/

# SSH to server and install
ssh prdr
crontab /tmp/crontab-production.txt

# Verify installation
crontab -l
```

## Cron Schedule

- **Comprehensive Daily Sync**: Daily at 02:00 UTC (~2 minutes)
  - Syncs events from Bravo JSON feed
  - Searches competitors (Google Custom Search, 100 queries/day max)
  - Searches YouTube videos for events (prioritized by date)
  - Pulls YouTube comments for upcoming events
  - Logs detailed results to `/home/appuser/apps/kids.ticketsnow.co.il/logs/`

- **Log Cleanup**: Weekly on Sunday at 03:00 UTC
  - Removes logs older than 30 days

## Sync Algorithm Details

The comprehensive sync runs 4 sequential steps:

```
1. EVENTS (Bravo JSON)              ~5s
   ├─ Fetch from Bravo
   ├─ Filter kids events
   ├─ Upsert to database
   └─ Mark removed events

2. COMPETITORS (Google Search)      ~30s
   ├─ Check quota (100/day max)
   ├─ Priority queue (by event date)
   ├─ Search ~25 events × 4 sites
   ├─ Cache results (7 days)
   └─ Log query usage

3. YOUTUBE VIDEOS                   ~60s
   ├─ Priority: events < 14 days
   ├─ Search @ticketsnowcoil first
   ├─ Fallback to general search
   ├─ Process ~50 events
   ├─ Cache results (24 hours)
   └─ Filter relevant videos

4. YOUTUBE COMMENTS                 ~30s
   ├─ Videos for events < 7 days
   ├─ Pull ~100 videos
   ├─ Max 10 comments per video
   ├─ Cache results (3 days)
   └─ Include replies

TOTAL: ~2 minutes
```

For detailed algorithm, quotas, and priorities, see:
- `CRON_SYNC_ALGORITHM.md` - Complete technical specification
- `/api/cron/status` - Real-time monitoring endpoint

## Manual Testing

Test the sync script manually before relying on cron:

```bash
ssh prdr

# Set environment and run
SITE_URL=https://kids.ticketsnow.co.il \
CRON_SECRET=your-production-secret \
/home/appuser/apps/kids.ticketsnow.co.il/scripts/cron-sync-events.sh

# Check logs
tail -f /home/appuser/apps/kids.ticketsnow.co.il/logs/cron-sync-$(date +%Y%m%d).log
```

## Check Sync Status

View real-time sync status and quotas:

```bash
# Via API
curl https://kids.ticketsnow.co.il/api/cron/status | jq '.'

# Via browser
open https://kids.ticketsnow.co.il/api/cron/status
```

This shows:
- Last sync results
- Daily quota usage (Google Search)
- Recent sync history
- Database stats
- Success rate

## Monitoring

View cron execution logs:

```bash
# Main cron log
tail -f /home/appuser/apps/kids.ticketsnow.co.il/logs/cron.log

# Daily sync logs
ls -lh /home/appuser/apps/kids.ticketsnow.co.il/logs/cron-sync-*.log
tail -f /home/appuser/apps/kids.ticketsnow.co.il/logs/cron-sync-$(date +%Y%m%d).log
```

## Troubleshooting

### Cron not running

1. Check crontab is installed: `crontab -l`
2. Check cron service: `sudo systemctl status cron`
3. Check syslog: `grep CRON /var/log/syslog`

### Authentication errors (401)

- Verify `CRON_SECRET` in crontab matches the one in production `.env`
- Check the secret is properly exported in the cron environment

### Sync failures

1. Check the API is accessible: `curl https://kids.ticketsnow.co.il/api/events`
2. Test sync endpoint manually (see Manual Testing above)
3. Check application logs for errors
4. Verify Bravo JSON feed is accessible

## Environment Variables Required

Ensure these are set in the crontab:

- `SITE_URL`: https://kids.ticketsnow.co.il
- `CRON_SECRET`: Must match production `.env` file
- `LOG_DIR`: /home/appuser/apps/kids.ticketsnow.co.il/logs
