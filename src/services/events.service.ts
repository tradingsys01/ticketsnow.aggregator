import axios from 'axios'
import prisma from '@/lib/db'
import type { BravoEvent } from '@/types'
import { getRelatedCities, getRegionName } from '@/lib/city-regions'

const BRAVO_JSON_URL = process.env.BRAVO_JSON_URL || 'https://bravo.ticketsnow.co.il/xml/partner/shows.json'

/**
 * Fetch events from Bravo JSON API
 */
export async function fetchFromBravo(): Promise<BravoEvent[]> {
  try {
    const response = await axios.get(BRAVO_JSON_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'kids.ticketsnow.co.il'
      }
    })

    if (Array.isArray(response.data)) {
      return response.data
    } else if (response.data.Shows && Array.isArray(response.data.Shows)) {
      return response.data.Shows
    } else if (response.data.shows && Array.isArray(response.data.shows)) {
      return response.data.shows
    } else if (response.data.events && Array.isArray(response.data.events)) {
      return response.data.events
    }

    console.warn('Unexpected Bravo JSON structure:', Object.keys(response.data))
    return []
  } catch (error) {
    console.error('Error fetching from Bravo:', error)
    throw new Error('Failed to fetch events from Bravo')
  }
}

/**
 * Filter events that are for kids
 */
export function filterKidsEvents(events: BravoEvent[]): BravoEvent[] {
  const kidsKeywords = ['ילדים', 'ילד', 'נוער', 'משפחה']

  return events.filter(event => {
    // Check both 'section' (Bravo field) and 'category' (fallback)
    const section = (event.section || event.category || '').toLowerCase()

    // Check if section contains kids-related keywords
    return kidsKeywords.some(keyword => section.includes(keyword))
  })
}

/**
 * Generate URL-safe slug from Hebrew text
 */
export function generateSlug(name: string): string {
  // Remove special characters and convert to lowercase
  let slug = name
    .toLowerCase()
    .replace(/[^\u0590-\u05FFa-z0-9\s-]/g, '') // Keep Hebrew, English, numbers, spaces, hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

  // If slug is empty or too short, use a fallback
  if (slug.length < 3) {
    slug = `event-${Date.now()}`
  }

  return slug
}

/**
 * Normalize Bravo event to our Event type
 */
export function normalizeEvent(bravoEvent: BravoEvent) {
  const slug = generateSlug(bravoEvent.name)

  // Extract first seance date if available
  let eventDate = new Date(bravoEvent.dateFrom || bravoEvent.date || new Date())

  // Try to get venue and city from seances if available
  let venue = 'לא צוין'
  let city = 'לא צוין'

  if (bravoEvent.Seances && Array.isArray(bravoEvent.Seances) && bravoEvent.Seances.length > 0) {
    const firstSeance = bravoEvent.Seances[0]
    venue = firstSeance.Hall || firstSeance.hall || venue
    city = firstSeance.City || firstSeance.city || city
  }

  // Use correct Bravo URL format: /announce/{eventId}
  const ticketUrl = `https://bravo.ticketsnow.co.il/announce/${bravoEvent.id}`

  return {
    externalId: String(bravoEvent.id),
    name: bravoEvent.name,
    slug: slug,
    description: bravoEvent.description || bravoEvent.announce || null,
    category: bravoEvent.section || bravoEvent.category || 'אחר',
    date: eventDate,
    time: null, // Will be extracted from seance if needed
    venue: venue,
    city: city,
    minPrice: bravoEvent.priceMin !== undefined ? Number(bravoEvent.priceMin) : null,
    maxPrice: bravoEvent.priceMax !== undefined ? Number(bravoEvent.priceMax) : null,
    imageUrl: bravoEvent.image || bravoEvent.imageUrl || null,
    ticketUrl: ticketUrl,
    performerName: bravoEvent.performerName || null,
    isKidsEvent: true,
    lastSynced: new Date()
  }
}

/**
 * Sync events from Bravo to database
 */
export async function syncEvents() {
  const startTime = Date.now()
  let stats = {
    eventsTotal: 0,
    eventsNew: 0,
    eventsUpdated: 0,
    eventsRemoved: 0,
    status: 'success' as 'success' | 'error',
    errorMessage: null as string | null
  }

  try {
    console.log('🔄 Starting event sync...')

    // Fetch and filter events
    const bravoEvents = await fetchFromBravo()
    const kidsEvents = filterKidsEvents(bravoEvents)

    console.log(`📥 Fetched ${bravoEvents.length} events, ${kidsEvents.length} are kids events`)

    stats.eventsTotal = kidsEvents.length

    // Get current external IDs in database
    const existingEvents = await prisma.event.findMany({
      select: { externalId: true, id: true }
    })
    const existingIds = new Set(existingEvents.map(e => e.externalId))
    const bravoIds = new Set(kidsEvents.map(e => String(e.id)))

    // Upsert events
    for (const bravoEvent of kidsEvents) {
      const normalized = normalizeEvent(bravoEvent)

      try {
        const existing = await prisma.event.findUnique({
          where: { externalId: normalized.externalId }
        })

        if (existing) {
          // Update existing
          await prisma.event.update({
            where: { externalId: normalized.externalId },
            data: normalized
          })
          stats.eventsUpdated++
        } else {
          // Create new
          await prisma.event.create({
            data: normalized
          })
          stats.eventsNew++
        }
      } catch (error) {
        console.error(`Error upserting event ${normalized.externalId}:`, error)
      }
    }

    // Mark removed events (not in Bravo anymore)
    const removedIds = Array.from(existingIds).filter(id => !bravoIds.has(id))
    if (removedIds.length > 0) {
      const result = await prisma.event.deleteMany({
        where: {
          externalId: { in: removedIds }
        }
      })
      stats.eventsRemoved = result.count
    }

    const duration = Date.now() - startTime
    console.log(`✅ Sync completed in ${duration}ms`)
    console.log(`   New: ${stats.eventsNew}, Updated: ${stats.eventsUpdated}, Removed: ${stats.eventsRemoved}`)

    // Log sync result
    await prisma.syncLog.create({
      data: {
        ...stats,
        status: 'success'
      }
    })

    return stats

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Sync failed:', errorMessage)

    stats.status = 'error'
    stats.errorMessage = errorMessage

    // Log error
    await prisma.syncLog.create({
      data: {
        ...stats,
        status: 'error',
        errorMessage
      }
    })

    throw error
  }
}

/**
 * Get upcoming events from database
 */
export async function getUpcomingEvents(limit: number = 20, offset: number = 0) {
  const now = new Date()

  return await prisma.event.findMany({
    where: {
      isKidsEvent: true,
      date: {
        gte: now
      }
    },
    orderBy: {
      date: 'asc'
    },
    take: limit,
    skip: offset
  })
}

/**
 * Get event by slug
 */
export async function getEventBySlug(slug: string) {
  return await prisma.event.findUnique({
    where: { slug }
  })
}

/**
 * Get total count of upcoming events
 */
export async function getUpcomingEventsCount() {
  const now = new Date()

  return await prisma.event.count({
    where: {
      isKidsEvent: true,
      date: {
        gte: now
      }
    }
  })
}

// Valid sort options for events
export type EventSortOption = 'date' | 'date_desc' | 'created' | 'updated' | 'name'

/**
 * Get orderBy clause based on sort option
 */
function getOrderBy(sort: EventSortOption) {
  switch (sort) {
    case 'date':
      return { date: 'asc' as const }
    case 'date_desc':
      return { date: 'desc' as const }
    case 'created':
      return { createdAt: 'desc' as const }
    case 'updated':
      return { updatedAt: 'desc' as const }
    case 'name':
      return { name: 'asc' as const }
    default:
      return { date: 'asc' as const }
  }
}

/**
 * Search events with pagination, filters, and sorting
 */
export async function searchEvents(
  query: string = '',
  limit: number = 20,
  offset: number = 0,
  city: string = '',
  dateFilter: string = '',
  sort: EventSortOption = 'date'
) {
  const now = new Date()
  const searchTerms = query.trim().toLowerCase()

  // Build date filter
  let dateFrom = now
  let dateTo: Date | undefined = undefined

  if (dateFilter === 'today') {
    dateTo = new Date(now)
    dateTo.setHours(23, 59, 59, 999)
  } else if (dateFilter === 'week') {
    dateTo = new Date(now)
    dateTo.setDate(dateTo.getDate() + 7)
  } else if (dateFilter === 'month') {
    dateTo = new Date(now)
    dateTo.setMonth(dateTo.getMonth() + 1)
  } else if (dateFilter === '3months') {
    dateTo = new Date(now)
    dateTo.setMonth(dateTo.getMonth() + 3)
  }

  // Build where clause
  const where: any = {
    isKidsEvent: true,
    date: dateTo ? { gte: dateFrom, lte: dateTo } : { gte: dateFrom }
  }

  // Add city filter - expand to include related cities in the same region
  if (city) {
    const relatedCities = getRelatedCities(city)
    if (relatedCities.length > 1) {
      // Multiple cities in the region - use IN filter
      where.city = { in: relatedCities }
    } else {
      // Single city or no region match - exact match
      where.city = city
    }
  }

  // Add search terms
  if (searchTerms) {
    where.OR = [
      { name: { contains: searchTerms } },
      { venue: { contains: searchTerms } },
      { city: { contains: searchTerms } },
      { performerName: { contains: searchTerms } },
      { category: { contains: searchTerms } }
    ]
  }

  return await prisma.event.findMany({
    where,
    orderBy: getOrderBy(sort),
    take: limit,
    skip: offset
  })
}

/**
 * Get count of search results with filters
 */
export async function getSearchResultsCount(
  query: string = '',
  city: string = '',
  dateFilter: string = ''
) {
  const now = new Date()
  const searchTerms = query.trim().toLowerCase()

  // Build date filter
  let dateFrom = now
  let dateTo: Date | undefined = undefined

  if (dateFilter === 'today') {
    dateTo = new Date(now)
    dateTo.setHours(23, 59, 59, 999)
  } else if (dateFilter === 'week') {
    dateTo = new Date(now)
    dateTo.setDate(dateTo.getDate() + 7)
  } else if (dateFilter === 'month') {
    dateTo = new Date(now)
    dateTo.setMonth(dateTo.getMonth() + 1)
  } else if (dateFilter === '3months') {
    dateTo = new Date(now)
    dateTo.setMonth(dateTo.getMonth() + 3)
  }

  // Build where clause
  const where: any = {
    isKidsEvent: true,
    date: dateTo ? { gte: dateFrom, lte: dateTo } : { gte: dateFrom }
  }

  // Add city filter - expand to include related cities in the same region
  if (city) {
    const relatedCities = getRelatedCities(city)
    if (relatedCities.length > 1) {
      // Multiple cities in the region - use IN filter
      where.city = { in: relatedCities }
    } else {
      // Single city or no region match - exact match
      where.city = city
    }
  }

  // Add search terms
  if (searchTerms) {
    where.OR = [
      { name: { contains: searchTerms } },
      { venue: { contains: searchTerms } },
      { city: { contains: searchTerms } },
      { performerName: { contains: searchTerms } },
      { category: { contains: searchTerms } }
    ]
  }

  return await prisma.event.count({ where })
}

/**
 * Get unique cities from upcoming events
 */
export async function getUniqueCities() {
  const now = new Date()

  const events = await prisma.event.findMany({
    where: {
      isKidsEvent: true,
      date: { gte: now }
    },
    select: {
      city: true
    },
    distinct: ['city'],
    orderBy: {
      city: 'asc'
    }
  })

  return events.map(e => e.city).filter(city => city !== 'לא צוין')
}
