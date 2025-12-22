# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kids events ticket aggregation site for kids.ticketsnow.co.il. Fetches kids events from Bravo JSON feed, enriches with competitor links (Google Search) and YouTube videos, optimized for SEO with Schema.org markup. Hebrew-only (RTL), future-ready for Russian.

**Data Source**: https://bravo.ticketsnow.co.il/xml/partner/shows.json (filter category: "ילדים")

## Development Commands

### Setup & Installation
```bash
# Initial setup (if not already done)
npx create-next-app@latest . --typescript --tailwind --app --src-dir
npm install @prisma/client axios googleapis
npm install -D prisma

# Initialize database
npx prisma init --datasource-provider sqlite
npx prisma migrate dev --name init
npx prisma generate
```

### Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations
npx prisma studio              # Visual database browser
npx prisma migrate dev         # Create migration
npx prisma generate           # Regenerate Prisma Client
npx prisma db push            # Push schema without migration (dev only)
```

### Testing
```bash
# Test API endpoints manually
curl http://localhost:3000/api/events
curl http://localhost:3000/api/events/sync -H "x-cron-secret: YOUR_SECRET"
curl http://localhost:3000/api/competitors/EVENT_ID
curl http://localhost:3000/api/youtube/EVENT_ID

# Validate Schema.org
# Use: https://search.google.com/test/rich-results
```

## Architecture Overview

### Service Flow
```
Bravo JSON Feed → Events Service → Database (SQLite/PostgreSQL)
                                    ↓
                     ┌──────────────┼──────────────┐
                     ↓              ↓              ↓
              Competitor      YouTube         Frontend
               Search         Search          (Next.js)
           (Google Custom)  (YouTube API)
```

### Data Flow & Caching Strategy

1. **Daily Cron** (02:00 UTC): Sync events from Bravo, search competitors
2. **Competitor Search**: Prioritized queue (new events first, then < 7 days, then 7-14 days)
3. **Query Limits**: Max 100 Google searches/day, cache results for 7 days
4. **YouTube Cache**: 24 hours expiry
5. **Event Sync**: Upsert on externalId, mark removed events

### Key Constraints

- **Google Search Quota**: 100 queries/day - smart prioritization required
- **Hebrew RTL**: All UI components must support RTL layout
- **Mobile-first**: Responsive design, kid-friendly colors
- **SEO Critical**: Schema.org Event markup, breadcrumbs, sitemap, metadata

## Technology Stack

- **Framework**: Next.js 14 App Router (TypeScript)
- **Database**: Prisma ORM with SQLite (dev) → PostgreSQL (prod)
- **Styling**: Tailwind CSS (RTL configured)
- **APIs**: Google Custom Search, YouTube Data API v3
- **Hosting**: Vercel (with cron jobs)

## Database Schema

### Core Tables
- **Event**: Main events table (externalId, slug, date, venue, prices, etc.)
- **CompetitorMatch**: Cached competitor search results (7-day expiry)
- **YouTubeVideo**: Cached video results (24-hour expiry)
- **SearchLog**: Daily query usage tracking
- **SyncLog**: Event sync history

**Critical Indexes**: category, date, isKidsEvent, expiresAt

## API Routes

- `GET /api/events?limit=20&offset=0&sort=date` - List events
- `GET /api/events/sync` - Trigger sync (protected by x-cron-secret header)
- `GET /api/competitors/[eventId]` - Get competitor links (auto-cached)
- `GET /api/youtube/[eventId]` - Get YouTube videos (auto-cached)

## Service Architecture

### events.service.ts
- `fetchFromBravo()`: Fetch raw JSON from Bravo
- `filterKidsEvents()`: Filter category="ילדים"
- `syncEvents()`: Full upsert sync with change tracking
- `generateSlug()`: Hebrew-safe URL slugs

### competitor.service.ts
- `findCompetitorMatches(event)`: Search ticketsi, leaan, eventer, youticket
- `calculateMatchScore()`: Score 0-1 based on performer/venue/date match
- `shouldSearchToday()`: Implements priority queue logic
- **Critical**: Respects 100/day limit, checks cache before searching

### youtube.service.ts
- `searchYouTube(query)`: Search by performer + "הצגה"/"ילדים"
- `filterRelevantVideos()`: Remove covers, reactions, tutorials
- Cache: 24h expiry

### sync.service.ts (Cron)
- `runDailySync()`: Orchestrates event sync + competitor search queue
- Priority: new events > events < 7 days > events 7-14 days
- Budget allocation: calculate total queries needed, cap at 100

## Component Architecture

### Server Components
- `app/page.tsx`: Homepage with event list (fetch from DB)
- `app/event/[slug]/page.tsx`: Event detail page (fetch event by slug)

### Client Components
- `CompetitorLinks`: Fetches on mount, shows external links
- `YouTubeVideos`: Fetches on mount, embedded player with thumbnails
- `EventCard`: Display in grid
- `EventList`: Grid wrapper with loading/empty states

### SEO Components
- `SchemaMarkup`: JSON-LD script tags for Event, Breadcrumb, FAQ schemas
- Dynamic metadata in each page
- Sitemap generator (`app/sitemap.ts`)

## Critical Implementation Rules

1. **Always Filter Kids Events**: Category must contain "ילדים" from Bravo feed
2. **Slug Generation**: Handle Hebrew characters properly, ensure uniqueness
3. **Competitor Search Budget**: NEVER exceed 100 queries/day - implement strict checking
4. **Cache First**: Always check cache before external API calls
5. **RTL Layout**: All Tailwind classes must account for RTL (use `text-right`, not `text-left`)
6. **Error Handling**: Graceful fallbacks for API failures (show "no competitors found" vs crash)
7. **Schema.org**: Event schema must include: name, startDate, location, offers (price range)

## Environment Variables

Required in `.env`:
```env
DATABASE_URL="file:./dev.db"
GOOGLE_API_KEY="..."
GOOGLE_SEARCH_ENGINE_ID="..."
YOUTUBE_API_KEY="..."
CRON_SECRET="..."
NEXT_PUBLIC_SITE_URL="https://kids.ticketsnow.co.il"
BRAVO_JSON_URL="https://bravo.ticketsnow.co.il/xml/partner/shows.json"
```

## Testing Strategy (Per User Requirements)

When implementing new features:
1. **Write tests first** - Create test file before implementation
2. **Implement solution** - Write minimal code to pass tests
3. **Run tests** - Verify implementation works

When investigating problems:
1. **Identify service flow** - Map which services are involved
2. **Fetch logs** - Check service logs for errors
3. **Fetch configuration** - Verify environment variables and settings

## Common Development Tasks

### Adding a New Competitor Site
1. Update competitor.service.ts search sites array
2. No schema changes needed (generic CompetitorMatch model)
3. Test match scoring with sample events

### Changing Cache Expiry Times
- Competitors: `CompetitorMatch` table, update `expiresAt` calculation
- YouTube: `YouTubeVideo` table, update `expiresAt` calculation

### Debug Sync Issues
1. Check `SyncLog` table for error messages
2. Verify Bravo JSON URL is accessible
3. Check category filter is matching "ילדים"

### Debug Search Quota Issues
1. Query `SearchLog` table: `SELECT SUM(queriesUsed) FROM SearchLog WHERE date >= datetime('now', 'start of day')`
2. Check competitor cache hit rate
3. Adjust priority queue if too many searches

## Deployment

**Platform**: Vercel

**Cron Setup**: vercel.json with daily schedule at 02:00 UTC

**Domain**: kids.ticketsnow.co.il (custom domain in Vercel settings)

**Production Database**: Switch `DATABASE_URL` to PostgreSQL connection string

**Post-Deploy**:
1. Submit sitemap.xml to Google Search Console
2. Test Schema.org with Google Rich Results Test
3. Verify cron job execution in Vercel logs

## Reference Documentation

See `KIDS_TICKETSNOW_DEVELOPMENT_PLAN.md` for:
- Complete phase-by-phase implementation plan
- Detailed API specifications
- Full Prisma schema
- Component design guidelines
- Claude Code prompts for each phase
