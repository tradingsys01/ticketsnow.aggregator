#!/bin/bash
# Comprehensive daily sync cron job for kids.ticketsnow.co.il
# Runs at 02:00 UTC daily
#
# Syncs:
# - Events from Bravo JSON feed
# - Competitor search (Google Custom Search)
# - YouTube videos (YouTube Data API)
# - YouTube comments (YouTube Data API)

# Configuration
SITE_URL="${SITE_URL:-https://kids.ticketsnow.co.il}"
CRON_SECRET="${CRON_SECRET}"
LOG_DIR="${LOG_DIR:-/home/appuser/apps/kids.ticketsnow.co.il/logs}"
LOG_FILE="${LOG_DIR}/cron-sync-$(date +%Y%m%d).log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log start
echo "[$(date -Iseconds)] ========================================" >> "$LOG_FILE"
echo "[$(date -Iseconds)] Starting comprehensive daily sync..." >> "$LOG_FILE"
echo "[$(date -Iseconds)] ========================================" >> "$LOG_FILE"

# Call the comprehensive daily sync API endpoint
# Note: Vercel cron uses Authorization: Bearer <secret>
# For direct server calls, we use x-cron-secret header for backward compatibility
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  "$SITE_URL/api/cron/daily-sync")

# Extract HTTP status code (last line) and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Log response
echo "[$(date -Iseconds)] HTTP Status: $HTTP_CODE" >> "$LOG_FILE"
echo "[$(date -Iseconds)] Response Body:" >> "$LOG_FILE"
echo "$BODY" | jq '.' >> "$LOG_FILE" 2>/dev/null || echo "$BODY" >> "$LOG_FILE"

# Parse and log summary (if jq available)
if command -v jq &> /dev/null && [ "$HTTP_CODE" -eq 200 ]; then
  echo "[$(date -Iseconds)] ----------------------------------------" >> "$LOG_FILE"
  echo "[$(date -Iseconds)] Sync Summary:" >> "$LOG_FILE"

  EVENTS_NEW=$(echo "$BODY" | jq -r '.eventSync.new // 0')
  EVENTS_UPDATED=$(echo "$BODY" | jq -r '.eventSync.updated // 0')
  EVENTS_REMOVED=$(echo "$BODY" | jq -r '.eventSync.removed // 0')

  COMPETITORS_PROCESSED=$(echo "$BODY" | jq -r '.competitorSearch.processed // 0')
  COMPETITORS_QUERIES=$(echo "$BODY" | jq -r '.competitorSearch.queriesUsed // 0')

  VIDEOS_PROCESSED=$(echo "$BODY" | jq -r '.youtubeVideos.eventsProcessed // 0')
  VIDEOS_FOUND=$(echo "$BODY" | jq -r '.youtubeVideos.videosFound // 0')

  COMMENTS_VIDEOS=$(echo "$BODY" | jq -r '.youtubeComments.videosProcessed // 0')
  COMMENTS_FETCHED=$(echo "$BODY" | jq -r '.youtubeComments.commentsFetched // 0')

  DURATION=$(echo "$BODY" | jq -r '.duration // "N/A"')

  echo "[$(date -Iseconds)]   Duration: $DURATION" >> "$LOG_FILE"
  echo "[$(date -Iseconds)]   Events: $EVENTS_NEW new, $EVENTS_UPDATED updated, $EVENTS_REMOVED removed" >> "$LOG_FILE"
  echo "[$(date -Iseconds)]   Competitors: $COMPETITORS_PROCESSED events, $COMPETITORS_QUERIES queries used" >> "$LOG_FILE"
  echo "[$(date -Iseconds)]   YouTube Videos: $VIDEOS_PROCESSED events, $VIDEOS_FOUND videos found" >> "$LOG_FILE"
  echo "[$(date -Iseconds)]   YouTube Comments: $COMMENTS_VIDEOS videos, $COMMENTS_FETCHED comments fetched" >> "$LOG_FILE"
  echo "[$(date -Iseconds)] ----------------------------------------" >> "$LOG_FILE"
fi

# Check if successful
if [ "$HTTP_CODE" -eq 200 ]; then
  echo "[$(date -Iseconds)] ✅ Sync completed successfully" >> "$LOG_FILE"
  exit 0
else
  echo "[$(date -Iseconds)] ❌ Sync failed with HTTP status $HTTP_CODE" >> "$LOG_FILE"
  exit 1
fi
