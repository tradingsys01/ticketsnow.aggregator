/**
 * Comprehensive Sync Service
 *
 * Orchestrates all daily sync operations:
 * 1. Event sync from Bravo
 * 2. Competitor search (Google Custom Search)
 * 3. YouTube video search (YouTube Data API)
 * 4. YouTube comments pulling (YouTube Data API)
 */

import prisma from '@/lib/db'
import { syncEvents } from './events.service'
import { processCompetitorSearchQueue, clearDebugLogs, getDebugLogs } from './competitor.service'
import { findEventVideos, getVideoComments, clearYouTubeDebugLogs, getYouTubeDebugLogs } from './youtube.service'
import type { Event } from '@prisma/client'

interface SyncStats {
  eventSync: {
    total: number
    new: number
    updated: number
    removed: number
  }
  competitorSearch: {
    processed: number
    queriesUsed: number
    remaining: number
    matchesFound: number
  }
  youtubeVideos: {
    eventsProcessed: number
    videosFound: number
    cacheHits: number
  }
  youtubeComments: {
    videosProcessed: number
    commentsFetched: number
    cacheHits: number
  }
}

/**
 * Check if event needs YouTube video search
 */
async function shouldSearchVideos(event: Event): Promise<boolean> {
  // Check cache
  const cached = await prisma.youTubeVideo.findFirst({
    where: {
      eventId: event.id,
      expiresAt: { gt: new Date() }
    }
  })

  if (cached) {
    return false // Cache still valid
  }

  // Calculate days until event
  const today = new Date()
  const eventDate = new Date(event.date)
  const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // High priority: events < 14 days
  if (daysUntil <= 14 && daysUntil >= 0) {
    return true
  }

  // Medium priority: new events (created today)
  const createdToday = event.createdAt.toDateString() === today.toDateString()
  if (createdToday) {
    return true
  }

  // Low priority: never searched before
  const hasBeenSearched = await prisma.youTubeVideo.count({
    where: { eventId: event.id }
  })

  return hasBeenSearched === 0 && daysUntil <= 30
}

/**
 * Process YouTube video search queue
 */
async function processYouTubeVideoQueue(maxSearches: number = 50): Promise<{
  eventsProcessed: number
  videosFound: number
  cacheHits: number
}> {
  console.log(`Processing YouTube video search queue (max ${maxSearches} searches)`)

  // Get upcoming events, prioritized by date
  const events = await prisma.event.findMany({
    where: {
      isKidsEvent: true,
      date: {
        gte: new Date(),
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
      }
    },
    orderBy: { date: 'asc' }
  })

  let eventsProcessed = 0
  let videosFound = 0
  let cacheHits = 0

  for (const event of events) {
    if (eventsProcessed >= maxSearches) {
      break
    }

    try {
      // Check if we should search
      const needsSearch = await shouldSearchVideos(event)

      if (!needsSearch) {
        cacheHits++
        continue
      }

      // Search for videos
      const videos = await findEventVideos(event)
      videosFound += videos.length

      eventsProcessed++

      console.log(`  ✓ Event "${event.name}": found ${videos.length} videos`)

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.error(`  ✗ Error processing event ${event.id}:`, error)
    }
  }

  console.log(`YouTube video search: ${eventsProcessed} events, ${videosFound} videos, ${cacheHits} cache hits`)

  return { eventsProcessed, videosFound, cacheHits }
}

/**
 * Check if video needs comments pulling
 */
async function shouldPullComments(video: any, eventDate: Date): Promise<boolean> {
  // Check cache
  const cached = await prisma.videoComment.findFirst({
    where: {
      videoId: video.videoId,
      expiresAt: { gt: new Date() }
    }
  })

  if (cached) {
    return false // Cache still valid
  }

  // Calculate days until event
  const today = new Date()
  const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // Only pull comments for events < 7 days away
  return daysUntil <= 7 && daysUntil >= -1 // Include events from yesterday
}

/**
 * Process YouTube comments queue
 */
async function processYouTubeCommentsQueue(maxVideos: number = 100): Promise<{
  videosProcessed: number
  commentsFetched: number
  cacheHits: number
}> {
  console.log(`Processing YouTube comments queue (max ${maxVideos} videos)`)

  // Get videos for upcoming events (next 7 days)
  const videos = await prisma.youTubeVideo.findMany({
    where: {
      event: {
        isKidsEvent: true,
        date: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      }
    },
    include: {
      event: true
    },
    orderBy: {
      event: {
        date: 'asc'
      }
    }
  })

  let videosProcessed = 0
  let commentsFetched = 0
  let cacheHits = 0

  for (const video of videos) {
    if (videosProcessed >= maxVideos) {
      break
    }

    try {
      // Check if we should pull comments
      const needsPull = await shouldPullComments(video, video.event.date)

      if (!needsPull) {
        cacheHits++
        continue
      }

      // Pull comments
      const comments = await getVideoComments(video.videoId)
      commentsFetched += comments.length

      videosProcessed++

      console.log(`  ✓ Video "${video.title}": pulled ${comments.length} comments`)

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.error(`  ✗ Error pulling comments for video ${video.videoId}:`, error)
    }
  }

  console.log(`YouTube comments: ${videosProcessed} videos, ${commentsFetched} comments, ${cacheHits} cache hits`)

  return { videosProcessed, commentsFetched, cacheHits }
}

/**
 * Get detailed data for email report
 */
async function getEmailReportData(stats: SyncStats): Promise<any> {
  // Get new events from today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const newEvents = await prisma.event.findMany({
    where: {
      isKidsEvent: true,
      createdAt: { gte: today }
    },
    select: {
      name: true,
      date: true,
      slug: true
    },
    orderBy: { date: 'asc' },
    take: 20
  })

  // Get top competitor matches from today
  const topMatches = await prisma.competitorMatch.findMany({
    where: {
      checkedAt: { gte: today }
    },
    include: {
      event: {
        select: { name: true }
      }
    },
    orderBy: { matchScore: 'desc' },
    take: 10
  })

  // Get new YouTube videos from today
  const newVideos = await prisma.youTubeVideo.findMany({
    where: {
      checkedAt: { gte: today }
    },
    include: {
      event: {
        select: { name: true }
      }
    },
    orderBy: { checkedAt: 'desc' },
    take: 20
  })

  // Get top comments from today
  const topComments = await prisma.videoComment.findMany({
    where: {
      checkedAt: { gte: today }
    },
    include: {
      video: {
        select: { title: true }
      }
    },
    orderBy: { likeCount: 'desc' },
    take: 10
  })

  return {
    newEventsList: newEvents.map(e => ({
      name: e.name,
      date: new Date(e.date).toLocaleDateString('he-IL'),
      url: `https://kids.ticketsnow.co.il/event/${e.slug}`
    })),
    topMatches: topMatches.map(m => ({
      event: m.event.name,
      competitor: m.competitorName,
      url: m.competitorUrl,
      score: m.matchScore
    })),
    newVideos: newVideos.map(v => ({
      event: v.event.name,
      title: v.title,
      url: `https://www.youtube.com/watch?v=${v.videoId}`,
      channel: v.channelTitle
    })),
    topComments: topComments.map(c => ({
      video: c.video.title,
      author: c.authorName,
      text: c.textDisplay,
      likes: c.likeCount
    }))
  }
}

/**
 * Run complete daily sync
 */
export async function runDailySync(): Promise<SyncStats> {
  const startTime = Date.now()

  // Clear debug logs from previous runs
  clearDebugLogs()
  clearYouTubeDebugLogs()

  console.log('🚀 Starting comprehensive daily sync...')

  // Step 1: Sync events from Bravo
  console.log('\n📥 Step 1: Syncing events from Bravo...')
  const eventSyncResult = await syncEvents()
  console.log(`✅ Event sync completed: ${eventSyncResult.eventsNew} new, ${eventSyncResult.eventsUpdated} updated, ${eventSyncResult.eventsRemoved} removed`)

  // Step 2: Process competitor search queue
  console.log('\n🔍 Step 2: Processing competitor search queue...')
  const competitorResult = await processCompetitorSearchQueue()
  console.log(`✅ Competitor search: ${competitorResult.processed} events, ${competitorResult.queriesUsed} queries used`)

  // Step 3: Process YouTube video search queue
  console.log('\n🎥 Step 3: Processing YouTube video search queue...')
  const youtubeVideoResult = await processYouTubeVideoQueue(50)
  console.log(`✅ YouTube videos: ${youtubeVideoResult.eventsProcessed} events, ${youtubeVideoResult.videosFound} videos found`)

  // Step 4: Process YouTube comments queue
  console.log('\n💬 Step 4: Processing YouTube comments queue...')
  const youtubeCommentsResult = await processYouTubeCommentsQueue(100)
  console.log(`✅ YouTube comments: ${youtubeCommentsResult.videosProcessed} videos, ${youtubeCommentsResult.commentsFetched} comments fetched`)

  const duration = Date.now() - startTime
  const durationSeconds = (duration / 1000).toFixed(2)

  console.log(`\n🎉 Daily sync completed successfully in ${durationSeconds}s`)

  return {
    eventSync: {
      total: eventSyncResult.eventsTotal,
      new: eventSyncResult.eventsNew,
      updated: eventSyncResult.eventsUpdated,
      removed: eventSyncResult.eventsRemoved
    },
    competitorSearch: {
      processed: competitorResult.processed,
      queriesUsed: competitorResult.queriesUsed || 0,
      remaining: competitorResult.remaining || 0,
      matchesFound: 0 // Could be enhanced to track this
    },
    youtubeVideos: {
      eventsProcessed: youtubeVideoResult.eventsProcessed,
      videosFound: youtubeVideoResult.videosFound,
      cacheHits: youtubeVideoResult.cacheHits
    },
    youtubeComments: {
      videosProcessed: youtubeCommentsResult.videosProcessed,
      commentsFetched: youtubeCommentsResult.commentsFetched,
      cacheHits: youtubeCommentsResult.cacheHits
    }
  }
}

export { getEmailReportData }
