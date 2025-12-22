# kids.ticketsnow.co.il - Development Plan
## For Claude Code Opus Mode Execution

---

## 📋 Project Overview

| Item | Value |
|------|-------|
| **Project** | Kids Events Ticket Site |
| **Domain** | kids.ticketsnow.co.il |
| **Data Source** | https://bravo.ticketsnow.co.il/xml/partner/shows.json |
| **Language** | Hebrew (he) only for now |
| **Category Filter** | ילדים (kids) from JSON feed |
| **Future Ready** | Russian language, age categories |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                  kids.ticketsnow.co.il                       │
│                     (Next.js / React)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         API                                  │
│                    /api/events                               │
│                    /api/competitors                          │
│                    /api/youtube                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       SERVICES                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Events    │  │ Competitor  │  │  YouTube    │          │
│  │   Service   │  │   Search    │  │   Search    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│                   SQLite / PostgreSQL                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   events    │  │ competitors │  │   youtube   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
kids-ticketsnow/
├── package.json
├── .env.example
├── .env
├── README.md
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout (RTL, Hebrew)
│   │   ├── page.tsx              # Homepage
│   │   ├── event/
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Single event page
│   │   ├── api/
│   │   │   ├── events/
│   │   │   │   └── route.ts      # GET /api/events
│   │   │   ├── competitors/
│   │   │   │   └── [eventId]/
│   │   │   │       └── route.ts  # GET /api/competitors/:eventId
│   │   │   ├── youtube/
│   │   │   │   └── [eventId]/
│   │   │   │       └── route.ts  # GET /api/youtube/:eventId
│   │   │   └── cron/
│   │   │       └── route.ts      # Cron job trigger
│   │   └── sitemap.ts            # Dynamic sitemap
│   │
│   ├── components/
│   │   ├── EventCard.tsx
│   │   ├── EventList.tsx
│   │   ├── EventDetails.tsx
│   │   ├── CompetitorLinks.tsx
│   │   ├── YouTubeVideos.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── SchemaMarkup.tsx
│   │
│   ├── services/
│   │   ├── events.service.ts     # Fetch & filter events from JSON
│   │   ├── competitor.service.ts # Google Custom Search
│   │   ├── youtube.service.ts    # YouTube Data API
│   │   └── cache.service.ts      # Cache management
│   │
│   ├── lib/
│   │   ├── db.ts                 # Database connection
│   │   ├── schema.ts             # Schema.org generators
│   │   └── utils.ts              # Helper functions
│   │
│   └── types/
│       └── index.ts              # TypeScript interfaces
│
├── prisma/
│   └── schema.prisma             # Database schema
│
├── public/
│   ├── robots.txt
│   └── images/
│
└── scripts/
    └── cron.ts                   # Scheduled jobs
```

---

## 🔧 Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | Next.js 14 (App Router) | SSR, SEO, API routes |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Fast, RTL support |
| Database | SQLite (dev) → PostgreSQL (prod) | Simple start, scale later |
| ORM | Prisma | Easy migrations |
| Caching | In-memory + DB | Free tier friendly |
| Hosting | Vercel | Free tier, easy deploy |

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@prisma/client": "^5.0.0",
    "googleapis": "^130.0.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "prisma": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0"
  }
}
```

---

## 🗄️ Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"  // Change to "postgresql" for production
  url      = env("DATABASE_URL")
}

model Event {
  id              String   @id @default(cuid())
  externalId      String   @unique  // ID from Bravo JSON
  name            String
  slug            String   @unique
  description     String?
  category        String
  date            DateTime
  time            String?
  venue           String
  city            String
  minPrice        Float?
  maxPrice        Float?
  imageUrl        String?
  ticketUrl       String
  performerName   String?
  isKidsEvent     Boolean  @default(true)
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  lastSynced      DateTime @default(now())
  
  // Relations
  competitors     CompetitorMatch[]
  youtubeVideos   YouTubeVideo[]
  
  @@index([category])
  @@index([date])
  @@index([isKidsEvent])
}

model CompetitorMatch {
  id              String   @id @default(cuid())
  eventId         String
  event           Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  competitorName  String   // ticketsi, leaan, eventer, youticket
  competitorUrl   String
  matchScore      Float    // 0.0 - 1.0
  
  // Cache control
  checkedAt       DateTime @default(now())
  expiresAt       DateTime
  
  @@unique([eventId, competitorName])
  @@index([eventId])
  @@index([expiresAt])
}

model YouTubeVideo {
  id              String   @id @default(cuid())
  eventId         String
  event           Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  videoId         String   // YouTube video ID
  title           String
  thumbnailUrl    String
  channelTitle    String
  
  // Cache control
  checkedAt       DateTime @default(now())
  expiresAt       DateTime
  
  @@unique([eventId, videoId])
  @@index([eventId])
}

model SearchLog {
  id              String   @id @default(cuid())
  date            DateTime @default(now())
  queryType       String   // "competitor" | "youtube"
  queriesUsed     Int
  
  @@index([date])
}

model SyncLog {
  id              String   @id @default(now())
  syncedAt        DateTime @default(now())
  eventsTotal     Int
  eventsNew       Int
  eventsUpdated   Int
  eventsRemoved   Int
  status          String   // "success" | "error"
  errorMessage    String?
}
```

---

## 🚀 Development Phases

---

### PHASE 1: Project Setup
**Estimated: 30 minutes**

```markdown
## Tasks

1.1. Create Next.js project with TypeScript
     Command: npx create-next-app@latest kids-ticketsnow --typescript --tailwind --app --src-dir

1.2. Install dependencies
     Command: npm install @prisma/client axios googleapis
     Command: npm install -D prisma

1.3. Initialize Prisma
     Command: npx prisma init --datasource-provider sqlite

1.4. Create .env file with placeholders

1.5. Configure Tailwind for RTL support

1.6. Create basic folder structure

1.7. Test: npm run dev works
```

**Claude Code Prompt:**
```
Create a new Next.js 14 project called "kids-ticketsnow" with:
- TypeScript
- Tailwind CSS configured for RTL (Hebrew)
- App Router
- Prisma with SQLite
- Basic folder structure as defined in the plan
- .env.example with required variables

Do not start the server yet.
```

---

### PHASE 2: Database & Types
**Estimated: 20 minutes**

```markdown
## Tasks

2.1. Create Prisma schema (copy from above)

2.2. Run initial migration
     Command: npx prisma migrate dev --name init

2.3. Create TypeScript interfaces in src/types/index.ts

2.4. Generate Prisma client
     Command: npx prisma generate

2.5. Create db.ts connection helper

2.6. Test: Prisma Studio works
     Command: npx prisma studio
```

**Claude Code Prompt:**
```
In the kids-ticketsnow project:

1. Create the Prisma schema with tables: Event, CompetitorMatch, YouTubeVideo, SearchLog, SyncLog

2. Create TypeScript interfaces in src/types/index.ts:
   - BravoEvent (raw from JSON)
   - Event (our normalized)
   - CompetitorResult
   - YouTubeResult

3. Create src/lib/db.ts with Prisma client singleton

4. Run prisma migrate dev --name init
```

---

### PHASE 3: Events Service
**Estimated: 45 minutes**

```markdown
## Tasks

3.1. Create events.service.ts with methods:
     - fetchFromBravo(): Fetch JSON from source
     - normalizeEvent(): Convert Bravo format to our format
     - filterKidsEvents(): Filter by category "ילדים"
     - syncEvents(): Full sync with database
     - getEvent(slug): Get single event
     - getUpcomingEvents(): List upcoming events
     - generateSlug(name): Create URL-safe slug

3.2. Create API route: GET /api/events
     - Query params: limit, offset, sort

3.3. Create API route: GET /api/events/[slug]

3.4. Test: Fetch and display events from Bravo JSON
```

**Claude Code Prompt:**
```
In kids-ticketsnow project, create src/services/events.service.ts:

1. Function fetchFromBravo():
   - Fetch https://bravo.ticketsnow.co.il/xml/partner/shows.json
   - Handle errors gracefully
   - Return raw JSON

2. Function normalizeEvent(bravoEvent):
   - Map Bravo JSON fields to our Event type
   - Generate slug from Hebrew name
   - Parse date properly

3. Function filterKidsEvents(events):
   - Filter where category contains "ילדים" or "ילדים" related terms
   - Return only kids events

4. Function syncEvents():
   - Fetch from Bravo
   - Filter kids only
   - Upsert to database (create new, update existing)
   - Mark removed events
   - Log sync results

5. Function getUpcomingEvents(limit):
   - Query database
   - Filter date >= today
   - Sort by date ascending
   - Return with pagination

6. Create API routes:
   - GET /api/events (list with filters)
   - GET /api/events/sync (trigger sync, protected)
```

---

### PHASE 4: Competitor Search Service
**Estimated: 60 minutes**

```markdown
## Tasks

4.1. Set up Google Custom Search Engine
     - Create at: https://programmablesearchengine.google.com/
     - Add sites: ticketsi.co.il, leaan.co.il, eventer.co.il, youticket.co.il
     - Get API key and Search Engine ID

4.2. Create competitor.service.ts with methods:
     - searchCompetitor(event): Search all competitors
     - calculateMatchScore(result, event): Score 0-1
     - shouldSearch(event): Check if search needed
     - getDailyQueryCount(): Track usage
     - getCachedResults(eventId): Get from DB
     - cacheResults(eventId, results): Save to DB

4.3. Create smart search logic:
     - Priority 1: New events
     - Priority 2: Events < 7 days
     - Priority 3: Events 7-14 days
     - Respect 100/day limit

4.4. Create API route: GET /api/competitors/[eventId]

4.5. Test: Search returns valid competitor links
```

**Claude Code Prompt:**
```
In kids-ticketsnow project, create src/services/competitor.service.ts:

COMPETITORS to search:
- ticketsi.co.il
- leaan.co.il  
- eventer.co.il
- youticket.co.il

1. Function searchGoogle(query, sites):
   - Use Google Custom Search JSON API
   - Search query: performer name or event name
   - Restrict to competitor sites
   - Return top 3 results per site

2. Function calculateMatchScore(result, event):
   - Check if performer name in result title/snippet (+0.4)
   - Check if venue name found (+0.3)
   - Check if date found (+0.3)
   - Return score 0.0 to 1.0

3. Function findCompetitorMatches(event):
   - Check cache first (not expired)
   - If cache valid, return cached
   - If need search, check daily limit
   - Search Google, score results
   - Cache results with 7-day expiry
   - Log query usage

4. Function shouldSearchToday(event):
   - Return true if: new event, or event < 14 days and cache expired
   - Return false if: already searched today, or event > 30 days away

5. Function getDailyQueryCount():
   - Count today's searches in SearchLog
   - Return count (max 100)

6. Create API route GET /api/competitors/[eventId]:
   - Get event from DB
   - Call findCompetitorMatches
   - Return competitor URLs with match scores

Environment variables needed:
- GOOGLE_API_KEY
- GOOGLE_SEARCH_ENGINE_ID
```

---

### PHASE 5: YouTube Service
**Estimated: 30 minutes**

```markdown
## Tasks

5.1. Create youtube.service.ts with methods:
     - searchVideos(event): Find relevant videos
     - filterRelevant(videos, event): Remove covers, reactions
     - getCachedVideos(eventId): Get from DB
     - cacheVideos(eventId, videos): Save to DB

5.2. Create API route: GET /api/youtube/[eventId]

5.3. Test: Returns embedded YouTube videos
```

**Claude Code Prompt:**
```
In kids-ticketsnow project, create src/services/youtube.service.ts:

1. Function searchYouTube(query):
   - Use YouTube Data API v3
   - Search for event/performer name + "הצגה" or "ילדים"
   - Filter: embeddable, duration medium
   - Return top 5 results

2. Function filterRelevantVideos(videos, event):
   - Keep videos where title contains performer/event name
   - Remove: reaction, cover, tutorial, karaoke
   - Return filtered list

3. Function findEventVideos(event):
   - Check cache first (24h expiry for YouTube)
   - If cache valid, return cached
   - Search YouTube
   - Filter relevant
   - Cache results
   - Return videos

4. Create API route GET /api/youtube/[eventId]:
   - Get event from DB
   - Call findEventVideos
   - Return video list with embed URLs

Environment variables needed:
- YOUTUBE_API_KEY
```

---

### PHASE 6: Schema.org & SEO
**Estimated: 30 minutes**

```markdown
## Tasks

6.1. Create schema.ts with generators:
     - generateEventSchema(event)
     - generateBreadcrumbSchema(event)
     - generateFAQSchema(event)
     - generateOrganizationSchema()

6.2. Create SchemaMarkup component

6.3. Create dynamic metadata for pages

6.4. Create robots.txt with AI crawlers

6.5. Create dynamic sitemap.ts

6.6. Test: Google Rich Results Test validates schema
```

**Claude Code Prompt:**
```
In kids-ticketsnow project, create SEO infrastructure:

1. Create src/lib/schema.ts:
   - generateEventSchema(event): Full Event schema with offers, location, performer
   - generateBreadcrumbSchema(path): Breadcrumb list
   - generateFAQSchema(event): Common questions about the event
   - generateOrganizationSchema(): Site organization info

2. Create src/components/SchemaMarkup.tsx:
   - Component that renders JSON-LD script tags
   - Props: event, breadcrumbs, includeFAQ

3. Create public/robots.txt:
   - Allow all crawlers
   - Specifically allow: GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot
   - Include sitemap URL

4. Create src/app/sitemap.ts:
   - Dynamic sitemap generation
   - Include all event pages
   - Include homepage
   - Proper lastmod dates

5. Update src/app/layout.tsx:
   - Add default metadata
   - Hebrew language
   - RTL direction
```

---

### PHASE 7: Frontend Components
**Estimated: 60 minutes**

```markdown
## Tasks

7.1. Create Header component
     - Logo
     - Navigation (simple for now)
     - RTL layout

7.2. Create Footer component
     - Links to main site
     - Copyright

7.3. Create EventCard component
     - Image
     - Title
     - Date, venue
     - Price range
     - Link to event page

7.4. Create EventList component
     - Grid of EventCards
     - Loading state
     - Empty state

7.5. Create EventDetails component
     - Full event info
     - Buy tickets button
     - Competitor links section
     - YouTube videos section

7.6. Create CompetitorLinks component
     - List of competitor sites
     - "בדוק גם באתרים אחרים"

7.7. Create YouTubeVideos component
     - Embedded player
     - Video thumbnails

7.8. Style all components with Tailwind
     - Kid-friendly colors
     - RTL support
     - Mobile responsive
```

**Claude Code Prompt:**
```
In kids-ticketsnow project, create frontend components:

Design guidelines:
- Kid-friendly: Colorful, fun, rounded corners
- Colors: Primary blue (#3B82F6), accent yellow (#FCD34D), pink (#EC4899)
- RTL Hebrew layout
- Mobile-first responsive

1. src/components/Header.tsx:
   - Logo "הצגות לילדים" with fun icon
   - Simple navigation
   - Sticky on scroll

2. src/components/Footer.tsx:
   - Link to ticketsnow.co.il main site
   - Copyright
   - Simple and clean

3. src/components/EventCard.tsx:
   - Props: event
   - Show: image, title, date (formatted Hebrew), venue, price "החל מ-XX₪"
   - Hover effect
   - Link to /event/[slug]

4. src/components/EventList.tsx:
   - Props: events[], loading, emptyMessage
   - Grid: 1 col mobile, 2 cols tablet, 3 cols desktop
   - Loading skeleton
   - Empty state with friendly message

5. src/components/EventDetails.tsx:
   - Props: event, competitors, videos
   - Full width hero image
   - All event details
   - Big "לרכישת כרטיסים" button
   - CompetitorLinks section
   - YouTubeVideos section

6. src/components/CompetitorLinks.tsx:
   - Props: competitors[]
   - Section title: "🔗 האירוע קיים גם ב:"
   - List with external link icons
   - If empty: "✨ בלעדי אצלנו!"

7. src/components/YouTubeVideos.tsx:
   - Props: videos[]
   - Main video player (iframe)
   - Thumbnail strip below
   - Click to change main video
```

---

### PHASE 8: Pages
**Estimated: 45 minutes**

```markdown
## Tasks

8.1. Create Homepage (src/app/page.tsx)
     - Hero section with fun design
     - Upcoming events grid
     - SEO metadata

8.2. Create Event Page (src/app/event/[slug]/page.tsx)
     - Fetch event by slug
     - Show EventDetails
     - Fetch competitors (client-side)
     - Fetch YouTube (client-side)
     - Schema markup
     - SEO metadata

8.3. Create 404 page

8.4. Create loading states

8.5. Test: All pages render correctly
```

**Claude Code Prompt:**
```
In kids-ticketsnow project, create pages:

1. src/app/page.tsx (Homepage):
   - Hero section: "🎭 הצגות וכרטיסים לילדים"
   - Subtitle: "כל ההצגות והמופעים לילדים במקום אחד"
   - EventList with upcoming events (server component, fetch from DB)
   - Metadata: title, description for SEO

2. src/app/event/[slug]/page.tsx (Event Page):
   - Server component: fetch event by slug
   - generateMetadata: dynamic title, description, OpenGraph
   - EventDetails component
   - SchemaMarkup component
   - Client components for: CompetitorLinks, YouTubeVideos (fetch on mount)
   - 404 if event not found

3. src/app/not-found.tsx:
   - Friendly 404 page
   - "אופס! הדף לא נמצא"
   - Link back to homepage

4. src/app/loading.tsx:
   - Loading skeleton for pages

5. src/app/event/[slug]/loading.tsx:
   - Loading skeleton for event page
```

---

### PHASE 9: Cron Job & Sync
**Estimated: 30 minutes**

```markdown
## Tasks

9.1. Create sync logic for daily run:
     - Sync events from Bravo
     - Search competitors for new events
     - Search competitors for events < 14 days (if cache expired)
     - Respect 100 query limit

9.2. Create API route for cron trigger
     - Protect with secret key
     - Log results

9.3. Set up Vercel Cron (or external cron)

9.4. Test: Manual sync works correctly
```

**Claude Code Prompt:**
```
In kids-ticketsnow project, create cron/sync system:

1. src/app/api/cron/route.ts:
   - POST endpoint
   - Verify CRON_SECRET from headers
   - Call syncEvents()
   - Call processCompetitorSearchQueue()
   - Return summary

2. src/services/sync.service.ts:
   - Function runDailySync():
     a. Sync events from Bravo JSON
     b. Get new events (created today)
     c. Get events < 7 days with expired cache
     d. Get events 7-14 days with expired cache
     e. Calculate queries needed
     f. If > 100: prioritize by date (soonest first)
     g. Execute searches up to 100 limit
     h. Log results

3. Create vercel.json with cron config:
   - Run daily at 02:00 UTC

Environment variables:
- CRON_SECRET (for protection)
```

---

### PHASE 10: Testing & Deployment
**Estimated: 30 minutes**

```markdown
## Tasks

10.1. Test all API endpoints manually

10.2. Test Schema with Google Rich Results Test

10.3. Test mobile responsiveness

10.4. Set up Vercel project

10.5. Configure environment variables in Vercel

10.6. Deploy to Vercel

10.7. Configure custom domain: kids.ticketsnow.co.il

10.8. Test production site

10.9. Submit sitemap to Google Search Console
```

**Claude Code Prompt:**
```
In kids-ticketsnow project, prepare for deployment:

1. Create README.md with:
   - Project description
   - Setup instructions
   - Environment variables list
   - Deployment steps

2. Create .env.example with all required variables:
   - DATABASE_URL
   - GOOGLE_API_KEY
   - GOOGLE_SEARCH_ENGINE_ID
   - YOUTUBE_API_KEY
   - CRON_SECRET
   - NEXT_PUBLIC_SITE_URL

3. Update next.config.js:
   - Image domains for Bravo images
   - Any redirects needed

4. Run build test: npm run build

5. Fix any build errors
```

---

## 📋 Environment Variables

```env
# .env.example

# Database
DATABASE_URL="file:./dev.db"

# Google Custom Search (for competitor search)
GOOGLE_API_KEY="your_google_api_key"
GOOGLE_SEARCH_ENGINE_ID="your_search_engine_id"

# YouTube Data API
YOUTUBE_API_KEY="your_youtube_api_key"

# Cron Job Protection
CRON_SECRET="random_secret_string"

# Site URL
NEXT_PUBLIC_SITE_URL="https://kids.ticketsnow.co.il"

# Source Data
BRAVO_JSON_URL="https://bravo.ticketsnow.co.il/xml/partner/shows.json"
```

---

## 🎯 Execution Order for Claude Code

```
SESSION 1: Setup (Phases 1-2)
─────────────────────────────
"Create Next.js project with Prisma, TypeScript, Tailwind RTL"

SESSION 2: Events Service (Phase 3)
─────────────────────────────
"Create events service to fetch from Bravo JSON and sync to database"

SESSION 3: Competitor Search (Phase 4)
─────────────────────────────
"Create competitor search service with Google Custom Search API"

SESSION 4: YouTube + SEO (Phases 5-6)
─────────────────────────────
"Create YouTube service and Schema.org markup"

SESSION 5: Frontend (Phases 7-8)
─────────────────────────────
"Create all React components and pages"

SESSION 6: Cron + Deploy (Phases 9-10)
─────────────────────────────
"Create sync service and prepare for deployment"
```

---

## ✅ Definition of Done

| Requirement | Check |
|-------------|-------|
| Homepage shows kids events from Bravo | ☐ |
| Event page shows full details | ☐ |
| Competitor links appear (if found) | ☐ |
| YouTube videos appear (if found) | ☐ |
| Schema.org validates in Google test | ☐ |
| Mobile responsive | ☐ |
| RTL Hebrew layout correct | ☐ |
| Daily sync works | ☐ |
| Stays within 100 queries/day | ☐ |
| Deployed to Vercel | ☐ |
| Custom domain configured | ☐ |

---

## 🔮 Future Enhancements (Not Now)

- [ ] Russian language (ru.kids.ticketsnow.co.il)
- [ ] Age categories (0-3, 3-6, 6-12)
- [ ] Weekend filter ("סופ״ש עם הילדים")
- [ ] Holiday sections (חנוכה, פסח)
- [ ] Price alerts
- [ ] Favorites / Wishlist
- [ ] Newsletter signup
- [ ] Social sharing buttons
- [ ] User reviews

---

## 📞 API Reference

### GET /api/events
```
Query params:
  - limit: number (default 20)
  - offset: number (default 0)
  - sort: "date" | "name" (default "date")

Response:
  {
    events: Event[],
    total: number,
    hasMore: boolean
  }
```

### GET /api/events/sync
```
Headers:
  - x-cron-secret: CRON_SECRET

Response:
  {
    success: boolean,
    eventsTotal: number,
    eventsNew: number,
    eventsUpdated: number
  }
```

### GET /api/competitors/[eventId]
```
Response:
  {
    competitors: [
      {
        name: "Ticketsi",
        url: "https://...",
        matchScore: 0.95
      }
    ],
    fromCache: boolean,
    checkedAt: "ISO date"
  }
```

### GET /api/youtube/[eventId]
```
Response:
  {
    videos: [
      {
        videoId: "abc123",
        title: "...",
        thumbnailUrl: "...",
        embedUrl: "https://youtube.com/embed/abc123"
      }
    ],
    fromCache: boolean
  }
```

---

*Document ready for Claude Code Opus Mode execution*
*Created: December 2024*
