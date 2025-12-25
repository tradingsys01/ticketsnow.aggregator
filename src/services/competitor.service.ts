import axios from 'axios'
import prisma from '@/lib/db'
import type { Event } from '@prisma/client'
import { GoogleAuth } from 'google-auth-library'
import * as fs from 'fs'
import * as path from 'path'

const GOOGLE_SERVICE_ACCOUNT_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID
const MAX_DAILY_QUERIES = 100

// Initialize Google Auth
let googleAuth: GoogleAuth | null = null

function getGoogleAuth(): GoogleAuth {
  if (!googleAuth) {
    const serviceAccountPath = GOOGLE_SERVICE_ACCOUNT_PATH
      ? path.resolve(process.cwd(), GOOGLE_SERVICE_ACCOUNT_PATH)
      : null

    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      googleAuth = new GoogleAuth({
        keyFile: serviceAccountPath,
        scopes: ['https://www.googleapis.com/auth/cse']
      })
    } else {
      throw new Error('Google service account file not found')
    }
  }
  return googleAuth
}

// Competitor sites to search
const COMPETITORS = [
  { name: 'Ticketsi', domain: 'ticketsi.co.il' },
  { name: 'Eventer', domain: 'eventer.co.il' },
  { name: 'Leaan', domain: 'leaan.co.il' },
  { name: 'Eventim', domain: 'eventim.co.il' }
]

interface SearchResult {
  title: string
  snippet: string
  link: string
}

/**
 * Check if URL is a generic listing page (not a specific event)
 */
function isGenericUrl(url: string): boolean {
  const genericPatterns = [
    /\/this-week/i,
    /\/this-weekend/i,
    /\/today/i,
    /\/tomorrow/i,
    /\/city\//i,
    /\/category\//i,
    /\/categories\//i,
    /\/all-events/i,
    /\/search\?/i,
    /\/search$/i,
    /\/browse/i,
    /\/listing/i,
    /\/$/, // Home page
  ]

  return genericPatterns.some(pattern => pattern.test(url))
}

/**
 * Check if URL looks like a direct event page
 */
function isEventUrl(url: string): boolean {
  const eventPatterns = [
    /\/event\//i,
    /\/show\//i,
    /\/ticket\//i,
    /\/tickets\//i,
    /\/production\//i,
    /\/artist\//i,
    /\/performance\//i,
    /\d{4,}/, // URLs with numeric IDs (event IDs)
  ]

  return eventPatterns.some(pattern => pattern.test(url))
}

/**
 * Calculate match score between search result and event
 * Score ranges from 0.0 to 1.0
 */
export function calculateMatchScore(result: SearchResult, event: Partial<Event>): number {
  const url = result.link.toLowerCase()

  // Reject generic listing pages immediately
  if (isGenericUrl(url)) {
    console.log(`Rejecting generic URL: ${url}`)
    return 0.0
  }

  let score = 0.0
  let matchedCriteria = 0

  const title = result.title.toLowerCase()
  const snippet = result.snippet.toLowerCase()
  const eventName = (event.name || '').toLowerCase()
  const performerName = (event.performerName || '').toLowerCase()
  const venue = (event.venue || '').toLowerCase()

  // Extract main keywords from event name (remove common words)
  const eventKeywords = eventName
    .replace(/הצגה|הצגת|מופע|כרטיסים|לילדים|ילדים|קרקס|תיאטרון/g, '')
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 2)

  // Check if event keywords in title (0.4 points) - require at least 2 keywords
  const matchedKeywords = eventKeywords.filter(keyword =>
    title.includes(keyword) || snippet.includes(keyword)
  )
  if (matchedKeywords.length >= 2) {
    score += 0.4
    matchedCriteria++
  } else if (matchedKeywords.length === 1 && eventKeywords.length <= 2) {
    // For short event names, 1 keyword match is ok
    score += 0.3
    matchedCriteria++
  }

  // Check if performer name in result (0.3 points)
  if (performerName && performerName.length > 2 &&
      (title.includes(performerName) || snippet.includes(performerName))) {
    score += 0.3
    matchedCriteria++
  }

  // Check if venue name in result (0.2 points)
  if (venue && venue !== 'לא צוין' && venue.length > 3 &&
      (title.includes(venue) || snippet.includes(venue))) {
    score += 0.2
    matchedCriteria++
  }

  // Bonus for direct event URLs (0.1 points)
  if (isEventUrl(url)) {
    score += 0.1
  }

  // Require reasonable confidence: 2+ criteria OR decent score with event URL
  if (matchedCriteria < 2 && score < 0.35) {
    console.log(`Low confidence match (${matchedCriteria} criteria, score ${score}): ${url}`)
    return 0.0
  }

  // For single criteria matches, require it to be an event URL
  if (matchedCriteria === 1 && !isEventUrl(url) && score < 0.5) {
    console.log(`Single criteria non-event URL (${matchedCriteria} criteria, score ${score}): ${url}`)
    return 0.0
  }

  return Math.min(score, 1.0)
}

/**
 * Search Google for a specific competitor site
 */
async function searchCompetitorSite(
  query: string,
  competitorDomain: string
): Promise<SearchResult[]> {
  if (!GOOGLE_SEARCH_ENGINE_ID) {
    throw new Error('Google Search Engine ID not configured')
  }

  try {
    // Get authenticated client
    const auth = getGoogleAuth()
    const client = await auth.getClient()
    const accessToken = await client.getAccessToken()

    if (!accessToken.token) {
      throw new Error('Failed to get access token')
    }

    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        cx: GOOGLE_SEARCH_ENGINE_ID,
        q: query,
        siteSearch: competitorDomain,
        num: 3 // Get top 3 results per site
      },
      headers: {
        'Authorization': `Bearer ${accessToken.token}`
      },
      timeout: 10000
    })

    if (response.data.items && Array.isArray(response.data.items)) {
      return response.data.items.map((item: any) => ({
        title: item.title || '',
        snippet: item.snippet || '',
        link: item.link || ''
      }))
    }

    return []
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      throw new Error('Google API quota exceeded')
    }
    console.error(`Error searching ${competitorDomain}:`, error)
    return []
  }
}

/**
 * Get count of queries used today
 */
export async function getDailyQueryCount(): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const logs = await prisma.searchLog.findMany({
    where: {
      date: {
        gte: today
      },
      queryType: 'competitor'
    }
  })

  return logs.reduce((sum, log) => sum + log.queriesUsed, 0)
}

/**
 * Log query usage
 */
async function logQueryUsage(queriesUsed: number): Promise<void> {
  await prisma.searchLog.create({
    data: {
      queryType: 'competitor',
      queriesUsed
    }
  })
}

/**
 * Check if we should search for this event today
 */
export async function shouldSearchToday(event: Event): Promise<boolean> {
  // Check if cache exists and is valid
  const cached = await prisma.competitorMatch.findFirst({
    where: {
      eventId: event.id,
      expiresAt: {
        gt: new Date()
      }
    }
  })

  if (cached) {
    return false // Cache is still valid
  }

  // Calculate days until event
  const today = new Date()
  const eventDate = new Date(event.date)
  const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // Don't search for events more than 30 days away
  if (daysUntil > 30) {
    return false
  }

  // Priority events (< 14 days) should be searched
  if (daysUntil <= 14) {
    return true
  }

  // For events 14-30 days away, only search if never searched before
  const hasBeenSearched = await prisma.competitorMatch.count({
    where: { eventId: event.id }
  })

  return hasBeenSearched === 0
}

/**
 * Find competitor matches for an event
 */
export async function findCompetitorMatches(event: Event) {
  // Check cache first
  const cached = await prisma.competitorMatch.findMany({
    where: {
      eventId: event.id,
      expiresAt: {
        gt: new Date()
      }
    }
  })

  if (cached.length > 0) {
    console.log(`Using cached results for event ${event.id}`)
    return cached.map(c => ({
      competitorName: c.competitorName,
      competitorUrl: c.competitorUrl,
      matchScore: c.matchScore
    }))
  }

  // Check daily quota
  const dailyCount = await getDailyQueryCount()
  const queriesNeeded = COMPETITORS.length

  if (dailyCount + queriesNeeded > MAX_DAILY_QUERIES) {
    console.warn(`Daily quota would be exceeded: ${dailyCount} + ${queriesNeeded} > ${MAX_DAILY_QUERIES}`)
    throw new Error('Daily query quota exceeded')
  }

  console.log(`Searching competitors for: ${event.name}`)

  // Build search query - use ONLY event name (title)
  // Don't include venue/city because touring shows have multiple locations
  // Don't include performer to keep search broad
  const searchTerms = event.name

  const results = []
  let queriesUsed = 0

  // Search each competitor site
  for (const competitor of COMPETITORS) {
    try {
      const searchResults = await searchCompetitorSite(searchTerms, competitor.domain)
      queriesUsed++

      // Score and filter results
      for (const result of searchResults) {
        const score = calculateMatchScore(result, event)

        // Only keep results with reasonable match score (0.35+)
        if (score >= 0.35) {
          results.push({
            competitorName: competitor.name,
            competitorUrl: result.link,
            matchScore: score
          })
          console.log(`✓ Match found: ${competitor.name} (score: ${score.toFixed(2)}) - ${result.link}`)
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))

    } catch (error) {
      console.error(`Failed to search ${competitor.name}:`, error)
    }
  }

  // Log query usage
  if (queriesUsed > 0) {
    await logQueryUsage(queriesUsed)
  }

  // Cache results for 7 days
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // Save to database
  for (const result of results) {
    try {
      await prisma.competitorMatch.upsert({
        where: {
          eventId_competitorName: {
            eventId: event.id,
            competitorName: result.competitorName
          }
        },
        create: {
          eventId: event.id,
          competitorName: result.competitorName,
          competitorUrl: result.competitorUrl,
          matchScore: result.matchScore,
          expiresAt
        },
        update: {
          competitorUrl: result.competitorUrl,
          matchScore: result.matchScore,
          expiresAt,
          checkedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error caching competitor match:', error)
    }
  }

  console.log(`Found ${results.length} competitor matches (${queriesUsed} queries used)`)

  return results
}

/**
 * Get cached competitor matches for an event
 */
export async function getCachedCompetitors(eventId: string) {
  return await prisma.competitorMatch.findMany({
    where: {
      eventId,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      matchScore: 'desc'
    }
  })
}

/**
 * Process competitor search queue with priority
 */
export async function processCompetitorSearchQueue(maxQueries: number = MAX_DAILY_QUERIES) {
  const dailyCount = await getDailyQueryCount()
  const available = maxQueries - dailyCount

  if (available <= 0) {
    console.log('Daily quota exhausted')
    return { processed: 0, remaining: 0 }
  }

  console.log(`Processing competitor search queue (${available} queries available)`)

  // Get events that need searching, prioritized by date
  const events = await prisma.event.findMany({
    where: {
      isKidsEvent: true,
      date: {
        gte: new Date(),
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
      }
    },
    orderBy: {
      date: 'asc'
    }
  })

  let processed = 0
  const queriesPerEvent = COMPETITORS.length

  for (const event of events) {
    if (processed * queriesPerEvent >= available) {
      break
    }

    const shouldSearch = await shouldSearchToday(event)
    if (shouldSearch) {
      try {
        await findCompetitorMatches(event)
        processed++
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error)
        break // Stop if quota exceeded
      }
    }
  }

  const queriesUsed = processed * queriesPerEvent
  const remaining = available - queriesUsed

  console.log(`Processed ${processed} events (${queriesUsed} queries, ${remaining} remaining)`)

  return { processed, queriesUsed, remaining }
}
