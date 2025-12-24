# Complete Cron Sync Algorithm

## Overview

This document describes the complete daily sync algorithm for kids.ticketsnow.co.il, including all data sources, quotas, priorities, and caching strategies.

## System Architecture

```
Daily Cron (02:00 UTC)
  ↓
┌─────────────────────────────────────────────────────┐
│ 1. SYNC EVENTS FROM BRAVO                          │
│    - Fetch JSON feed                                │
│    - Filter kids events                             │
│    - Upsert to database                             │
│    - Mark removed events                            │
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ 2. SEARCH COMPETITORS (Google Custom Search)       │
│    - Priority queue: closest events first           │
│    - Quota: 100 queries/day max                     │
│    - Cache: 7 days                                  │
│    - Searches: Ticketmaster, Eventim, Eventer, Leaan│
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ 3. SEARCH YOUTUBE VIDEOS (YouTube Data API)        │
│    - Priority: events < 14 days OR new events       │
│    - Quota: ~10,000 units/day (~100 searches)       │
│    - Cache: 24 hours                                │
│    - Search: @ticketsnowcoil first, fallback general│
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ 4. PULL YOUTUBE COMMENTS (YouTube Data API)        │
│    - For videos found in step 3                     │
│    - Priority: Most viewed/relevant videos first    │
│    - Cache: 3 days                                  │
│    - Max 10 comments per video                      │
└─────────────────────────────────────────────────────┘
```

## Detailed Algorithm

### Step 1: Event Sync (Bravo JSON)

**Endpoint:** `/api/events/sync`

**Process:**
1. Fetch from `https://bravo.ticketsnow.co.il/xml/partner/shows.json`
2. Filter events where category contains: `["ילדים", "ילד", "נוער", "משפחה"]`
3. For each kids event:
   - Generate slug from Hebrew name
   - Normalize data structure
   - Upsert by `externalId`
4. Delete events no longer in Bravo feed
5. Log to `SyncLog` table

**Cache:** None (always fresh sync)
**Duration:** ~5-10 seconds
**Dependencies:** None

### Step 2: Competitor Search (Google Custom Search)

**Service:** `competitor.service.ts::processCompetitorSearchQueue()`

**Quota Management:**
- Max 100 queries per day
- Each event requires 4 queries (one per competitor)
- Daily budget: ~25 events max

**Priority Queue:**
1. **Highest Priority (P1):** Events 0-7 days away, no cache
2. **Medium Priority (P2):** Events 8-14 days away, no cache
3. **Low Priority (P3):** Events 15-30 days away, never searched
4. **Skip:** Events > 30 days away

**Algorithm:**
```
available_queries = 100 - getDailyQueryCount()
queries_per_event = 4 (Ticketmaster, Eventim, Eventer, Leaan)
max_events = floor(available_queries / queries_per_event)

events = getEvents({
  where: {
    date: { gte: now, lte: now + 30 days },
    isKidsEvent: true
  },
  orderBy: { date: 'asc' }
})

processed = 0
for event in events:
  if processed >= max_events:
    break

  if shouldSearchToday(event):  // Checks cache + priority
    findCompetitorMatches(event)
    processed++
```

**Cache Strategy:**
- Duration: 7 days
- Table: `CompetitorMatch`
- Key: `eventId + competitorName`

**Search Query:**
- Pattern: `"<event.name> <performer.name>" site:<competitor.domain>`
- Scoring: 0.0-1.0 based on keyword match, performer, venue
- Min Score: 0.3 to save result

### Step 3: YouTube Video Search

**Service:** `youtube.service.ts::findEventVideos()`

**Current Status:** ⚠️ NOT IN DAILY CRON (on-demand only)

**Quota Management:**
- YouTube Data API: 10,000 units/day
- Video search: ~100 units per query
- Daily budget: ~100 video searches

**Priority Queue:**
1. **Highest Priority (P1):** Events < 14 days, no cache
2. **Medium Priority (P2):** New events (never searched)
3. **Low Priority (P3):** Events with expired cache (> 24h)

**Algorithm:**
```
events = getEvents({
  where: {
    date: { gte: now },
    isKidsEvent: true
  },
  orderBy: { date: 'asc' }
})

processed = 0
max_searches = 50  // Conservative limit

for event in events:
  if processed >= max_searches:
    break

  cache = getCachedVideos(event.id)

  // Check if needs search
  needs_search = false
  if cache.length == 0 OR cache.expiresAt < now:
    if daysUntilEvent <= 14 OR event.isNew:
      needs_search = true

  if needs_search:
    query = event.name + " " + performer + " הצגה ילדים"

    // Search @ticketsnowcoil first
    videos = searchYouTubeWithFallback(query)
    relevantVideos = filterRelevantVideos(videos, event)

    // Cache for 24 hours
    for video in relevantVideos:
      saveToCache(video, expiresAt = now + 24h)

    processed++
```

**Cache Strategy:**
- Duration: 24 hours
- Table: `YouTubeVideo`
- Key: `eventId + videoId`

**Search Strategy:**
1. Search `@ticketsnowcoil` channel first (primary source)
2. If no results, fallback to general YouTube search
3. Filter: Hebrew language, embeddable, safe, 4-20 min duration
4. Exclude: reactions, covers, tutorials, karaoke

### Step 4: YouTube Comments Pulling

**Service:** `youtube.service.ts::getVideoComments()`

**Current Status:** ⚠️ NOT IN DAILY CRON (on-demand only)

**Quota Management:**
- Comment threads: 1 unit per call
- Daily budget: Can pull ~1000s of videos if needed
- Conservative limit: 100 videos/day

**Priority Queue:**
1. **Highest Priority (P1):** Videos for events < 7 days
2. **Medium Priority (P2):** Videos with no cached comments
3. **Low Priority (P3):** Videos with expired comments (> 3 days)

**Algorithm:**
```
videos = getVideosNeedingComments({
  orderBy: { event.date: 'asc' }
})

processed = 0
max_videos = 100

for video in videos:
  if processed >= max_videos:
    break

  cache = getCachedComments(video.videoId)

  if cache.length == 0 OR cache.expiresAt < now:
    if event.date <= now + 7 days:
      comments = fetchVideoComments(video.videoId, maxResults=10)

      // Cache for 3 days
      for comment in comments:
        saveToCache(comment, expiresAt = now + 3 days)

      processed++
```

**Cache Strategy:**
- Duration: 3 days
- Table: `VideoComment`
- Key: `commentId` (unique)
- Linked: `youtubeVideoId` → `YouTubeVideo` → `Event`

**Comment Filtering:**
- Order: relevance
- Max: 10 top-level comments + replies
- Format: plain text
- Include: author, likes, timestamp, text

## Complete Daily Sync Flow

### Execution Order (02:00 UTC)

```
START Daily Sync
├─ [5s]   1. Sync Events from Bravo
│          ├─ Fetch JSON
│          ├─ Filter kids events
│          ├─ Upsert to DB
│          └─ Log results
│
├─ [30s]  2. Process Competitor Search Queue
│          ├─ Check daily quota (100 queries)
│          ├─ Get priority events (next 30 days)
│          ├─ Search up to 25 events (4 queries each)
│          ├─ Cache results (7 days)
│          └─ Log query usage
│
├─ [60s]  3. Process YouTube Video Search Queue
│          ├─ Get priority events (next 30 days)
│          ├─ Search up to 50 events
│          ├─ Search @ticketsnowcoil first
│          ├─ Fallback to general search
│          ├─ Filter relevant videos
│          ├─ Cache results (24 hours)
│          └─ Log search count
│
└─ [30s]  4. Process YouTube Comments Queue
           ├─ Get videos for events < 7 days
           ├─ Pull up to 100 videos
           ├─ Fetch 10 comments each
           ├─ Cache results (3 days)
           └─ Log comment count

TOTAL: ~2 minutes
```

## Quota Summary

| Service | Quota | Daily Usage | Cost |
|---------|-------|-------------|------|
| Bravo JSON | Unlimited | 1 fetch | Free |
| Google Custom Search | 100 queries/day | ~25 events × 4 = 100 | Free tier |
| YouTube Video Search | 10,000 units/day | ~50 searches × 100 = 5,000 | Free tier |
| YouTube Comments | 10,000 units/day | ~100 videos × 1 = 100 | Free tier |

**Total Quota Usage:** ~5,100 / 20,100 units available (25%)

## Cache Expiry Strategy

| Data Type | Cache Duration | Reason |
|-----------|---------------|--------|
| Events | None (always sync) | Source of truth changes frequently |
| Competitors | 7 days | Ticket sites rarely change |
| YouTube Videos | 24 hours | New videos may be uploaded |
| YouTube Comments | 3 days | Comments update frequently |

## Priority Rules

### Competitor Search Priority
```python
def shouldSearchToday(event):
  if hasValidCache(event):
    return False  # Cache still good

  daysUntil = (event.date - now).days

  if daysUntil > 30:
    return False  # Too far out
  elif daysUntil <= 14:
    return True  # High priority
  else:
    return not hasBeenSearchedBefore(event)  # Search once
```

### YouTube Video Search Priority
```python
def shouldSearchVideos(event):
  cache = getCachedVideos(event)

  if cache and cache.expiresAt > now:
    return False  # Cache valid

  daysUntil = (event.date - now).days

  if daysUntil <= 14:
    return True  # High priority
  elif event.isNew:
    return True  # Search new events
  else:
    return cache.length == 0  # Search if never searched
```

### YouTube Comments Priority
```python
def shouldPullComments(video):
  cache = getCachedComments(video)

  if cache and cache.expiresAt > now:
    return False  # Cache valid

  daysUntil = (video.event.date - now).days

  return daysUntil <= 7  # Only pull for events < 7 days
```

## Monitoring & Logging

### Metrics to Track
1. **Event Sync**
   - Total events fetched
   - New events added
   - Events updated
   - Events removed
   - Sync duration

2. **Competitor Search**
   - Events processed
   - Queries used
   - Quota remaining
   - Matches found
   - Average match score

3. **YouTube Videos**
   - Events searched
   - Videos found
   - Cache hit rate
   - API units used

4. **YouTube Comments**
   - Videos processed
   - Comments fetched
   - Cache hit rate
   - API units used

### Health Checks
- Daily quota not exceeded
- Sync success rate > 95%
- Average cache hit rate > 60%
- No API errors

## Error Handling

1. **Bravo Sync Failure**
   - Log error, don't proceed to other steps
   - Alert if fails 3 consecutive times
   - Keep existing events in DB

2. **Quota Exceeded**
   - Stop processing immediately
   - Log warning
   - Resume next day

3. **API Rate Limiting**
   - Add exponential backoff
   - Reduce batch size
   - Skip to next priority level

4. **Individual Event Failures**
   - Log error
   - Continue with next event
   - Don't fail entire batch

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Event Sync | ✅ Implemented | `/api/events/sync` |
| Competitor Search | ✅ Implemented | `/api/cron/daily-sync` |
| YouTube Videos | ⚠️ On-demand only | Needs cron integration |
| YouTube Comments | ⚠️ On-demand only | Needs cron integration |

## Next Steps

1. ✅ Create service methods for YouTube video queue processing
2. ✅ Create service methods for YouTube comments queue processing
3. ✅ Update `/api/cron/daily-sync` to include YouTube steps
4. ✅ Add quota tracking for YouTube API
5. ✅ Update cron scripts for production deployment
6. ✅ Add monitoring dashboard for all sync metrics
