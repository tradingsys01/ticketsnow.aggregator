# kids.ticketsnow.co.il

> 🎭 Kids' Theater Events Aggregator - Next.js 14 Application

A production-ready Next.js application that aggregates and displays kids' theater events from Bravo ticketing system, enriched with competitor pricing and YouTube videos.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Open http://localhost:3000
```

## Features

- 🎪 **Automated Event Sync**: Daily cron job syncs 140+ kids events
- 💰 **Price Comparison**: Finds competitor prices on 4 ticket sites
- 🎥 **YouTube Videos**: Embeds relevant YouTube videos
- 🔍 **SEO Optimized**: Schema.org markup, sitemap, meta tags
- 🇮🇱 **Hebrew/RTL**: Full right-to-left support
- 🎨 **Kid-Friendly**: Colorful, playful design
- ⚡ **Fast**: Static generation, image optimization
- 📊 **Monitoring**: Real-time status endpoint

## Tech Stack

- **Framework**: Next.js 14.2 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Prisma + PostgreSQL
- **Deployment**: Vercel
- **APIs**: Bravo, Google Custom Search, YouTube

## Project Structure

```
src/
├── app/
│   ├── api/cron/          # Cron job endpoints
│   ├── event/[slug]/      # Dynamic event pages
│   ├── page.tsx           # Homepage
│   └── sitemap.ts         # Dynamic sitemap
├── components/            # React components
├── services/              # Business logic
│   ├── events.service.ts
│   ├── competitor.service.ts
│   └── youtube.service.ts
└── lib/                   # Utilities
```

## Key Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma migrate dev   # Run migrations
npx prisma studio        # Open database GUI
npx prisma generate      # Generate Prisma client

# Deployment
vercel --prod            # Deploy to Vercel
```

## API Endpoints

### Public
- `GET /api/cron/status` - System health and monitoring
- `GET /api/events` - List upcoming events
- `GET /sitemap.xml` - Dynamic sitemap

### Protected
- `GET /api/cron/daily-sync` - Trigger sync (requires auth)

## Environment Variables

Required:
```bash
DATABASE_URL="postgresql://..."
CRON_SECRET="<random-secret>"
NEXT_PUBLIC_SITE_URL="https://kids.ticketsnow.co.il"
GOOGLE_SERVICE_ACCOUNT_PATH="./google-service-account.json"
GOOGLE_SEARCH_ENGINE_ID="..."
```

Optional:
```bash
YOUTUBE_API_KEY="..."
```

## Deployment

See detailed instructions in [`DEPLOYMENT.md`](./DEPLOYMENT.md)

Quick deploy:
```bash
vercel --prod
```

## Documentation

- [`PROJECT_COMPLETE.md`](./PROJECT_COMPLETE.md) - Full project overview
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) - Deployment guide
- [`PHASE_8_COMPLETED.md`](./PHASE_8_COMPLETED.md) - Pages implementation
- [`PHASE_9_COMPLETED.md`](./PHASE_9_COMPLETED.md) - Cron job implementation

## Monitoring

Check system status:
```bash
curl https://kids.ticketsnow.co.il/api/cron/status
```

Response includes:
- Last sync status
- Event counts
- Quota usage
- Success rates

## Development Status

✅ **All 9 phases completed**
- Phase 1: Project Setup
- Phase 2: Database & Types
- Phase 3: Events Service
- Phase 4: Competitor Search
- Phase 5: YouTube Service
- Phase 6: SEO & Schema.org
- Phase 7: Frontend Components
- Phase 8: Pages
- Phase 9: Cron Job & Sync

**Status**: Production Ready ✓

## Testing

```bash
# Test homepage
curl http://localhost:3000/

# Test event page (Hebrew slug)
curl "http://localhost:3000/event/חנן-הגנן-תיאטרון-המדיטק"

# Test status endpoint
curl http://localhost:3000/api/cron/status

# Test sync (requires auth)
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/daily-sync
```

## Performance

- Homepage: < 2s (static)
- Event pages: < 1s (static)
- Sync duration: ~80s
- API quota: 96/100 queries/day

## License

Private project for ticketsnow.co.il

## Support

For issues or questions:
1. Check [`DEPLOYMENT.md`](./DEPLOYMENT.md)
2. Review [`PROJECT_COMPLETE.md`](./PROJECT_COMPLETE.md)
3. Check Vercel Dashboard logs
4. View `/api/cron/status` endpoint

---

Built with ❤️ using Next.js 14, TypeScript, and Tailwind CSS
