# Google Custom Search Setup Guide

## Overview

The competitor search feature uses Google Custom Search API to find events on competitor websites:
- ticketsi.co.il
- leaan.co.il
- eventer.co.il
- youticket.co.il

## Setup Steps

### 1. Get Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Custom Search JSON API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Custom Search API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key
   - (Optional) Restrict the key to "Custom Search API" only

### 2. Create Custom Search Engine

1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click "Add" to create new search engine
3. Configure:
   - **Name**: Kids Events Competitors
   - **What to search**: Specific sites
   - **Sites to search**:
     ```
     ticketsi.co.il/*
     leaan.co.il/*
     eventer.co.il/*
     youticket.co.il/*
     ```
   - **Language**: Hebrew
   - **Search settings**: Search entire web
4. Click "Create"
5. Copy the **Search Engine ID** (cx parameter)

### 3. Configure Environment Variables

Add to your `.env` file:

```env
GOOGLE_API_KEY="your_api_key_here"
GOOGLE_SEARCH_ENGINE_ID="your_search_engine_id_here"
```

### 4. Test the Setup

Run the test script:

```bash
npx tsx src/services/__test_competitor.ts
```

Or test via API:

```bash
# Get an event ID
EVENT_ID=$(curl -s "http://localhost:3000/api/events?limit=1" | jq -r '.events[0].id')

# Search for competitors
curl "http://localhost:3000/api/competitors/$EVENT_ID" | jq '.'
```

Expected response (with API keys):
```json
{
  "competitors": [
    {
      "name": "Ticketsi",
      "url": "https://ticketsi.co.il/show/123",
      "matchScore": 0.85
    }
  ],
  "fromCache": false,
  "checkedAt": "2024-12-21T10:00:00.000Z"
}
```

## Quota & Pricing

### Free Tier
- **100 queries per day** - FREE
- Sufficient for our use case

### Calculation
- 4 competitors × 145 events = 580 potential queries
- With smart caching (7 days) and prioritization:
  - ~20 new events per week = 80 queries/week
  - ~10 upcoming events re-searched = 40 queries/week
  - Total: ~120 queries/week = **~17 queries/day average**
- Easily within free tier

### Quota Management
The system automatically:
- Caches results for 7 days
- Tracks daily usage in `SearchLog` table
- Prioritizes upcoming events (< 14 days)
- Stops searching when quota reached
- Respects 100/day limit

## How It Works

### Search Flow
1. Client requests competitors for event
2. Check cache (7-day expiry)
3. If cache miss and within quota:
   - Search each competitor site (4 queries)
   - Calculate match scores
   - Cache results
   - Return matches
4. If quota exceeded:
   - Return cached results only
   - Or return empty with message

### Match Scoring (0.0 - 1.0)
- **0.4 points**: Event name keywords found
- **0.3 points**: Performer name found
- **0.3 points**: Venue name found
- Minimum threshold: 0.3 to be included

### Priority Queue
Daily cron job processes events by priority:
1. **New events** (never searched)
2. **Events < 7 days** (cache expired)
3. **Events 7-14 days** (cache expired)
4. Events > 14 days (low priority, only if quota available)

## Monitoring

### Check daily usage:
```bash
# Via database
npx prisma studio
# Check SearchLog table

# Via service
npx tsx -e "import {getDailyQueryCount} from './src/services/competitor.service'; getDailyQueryCount().then(console.log)"
```

### View cached results:
```bash
# Via database
npx prisma studio
# Check CompetitorMatch table
```

## Troubleshooting

### "API keys missing" error
- Verify `.env` has both variables set
- Restart dev server after adding keys

### "Daily quota exceeded" error
- Check `SearchLog` table for usage
- Wait until next day (resets at midnight UTC)
- Or increase quota in Google Cloud Console (paid)

### No results found
- Event may not exist on competitor sites
- Match score may be < 0.3 threshold
- Competitor site structure may have changed

### "API quota exceeded" from Google
- Check Google Cloud Console quota page
- Verify you haven't exceeded 100/day
- Check if API key is restricted correctly

## Cost Optimization

Already implemented:
- ✅ 7-day cache
- ✅ Priority queue
- ✅ Daily quota tracking
- ✅ Match score threshold
- ✅ Only search upcoming events (< 30 days)

Future optimizations (if needed):
- Increase cache to 14 days
- Only search events < 7 days
- Search fewer competitors
- Manual trigger instead of automatic

## Production Deployment

For Vercel deployment:
1. Go to project settings
2. Add environment variables:
   - `GOOGLE_API_KEY`
   - `GOOGLE_SEARCH_ENGINE_ID`
3. Deploy
4. Test with production URL

The system will automatically start searching for competitors on the daily cron job.
