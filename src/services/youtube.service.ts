import { google } from 'googleapis'
import prisma from '@/lib/db'
import type { Event } from '@prisma/client'
import { GoogleAuth } from 'google-auth-library'
import * as fs from 'fs'
import * as path from 'path'

const GOOGLE_SERVICE_ACCOUNT_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
const CACHE_DURATION_HOURS = 24

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
        scopes: ['https://www.googleapis.com/auth/youtube.readonly']
      })
    } else {
      throw new Error('Google service account file not found')
    }
  }
  return googleAuth
}

interface YouTubeVideo {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
}

/**
 * Search YouTube for videos
 */
export async function searchYouTube(query: string): Promise<YouTubeVideo[]> {
  try {
    // Get authenticated client
    const auth = getGoogleAuth()
    const authClient = await auth.getClient()

    // Create YouTube API client
    const youtube = google.youtube({
      version: 'v3',
      auth: authClient as any
    })

    // Search for videos
    const response = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      maxResults: 5,
      videoEmbeddable: 'true',
      videoDuration: 'medium', // 4-20 minutes
      relevanceLanguage: 'he',
      safeSearch: 'strict'
    })

    if (!response.data.items) {
      return []
    }

    return response.data.items.map(item => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || '',
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url || '',
      channelTitle: item.snippet?.channelTitle || ''
    })).filter(v => v.videoId)

  } catch (error) {
    console.error('Error searching YouTube:', error)
    throw error
  }
}

/**
 * Filter out irrelevant videos (reactions, covers, tutorials)
 */
export function filterRelevantVideos(
  videos: YouTubeVideo[],
  event: Partial<Event>
): YouTubeVideo[] {
  const eventName = (event.name || '').toLowerCase()
  const performerName = (event.performerName || '').toLowerCase()

  // Keywords that indicate irrelevant content
  const excludeKeywords = [
    'reaction',
    'react',
    'review',
    'cover',
    'tutorial',
    'karaoke',
    'קריוקי',
    'מדריך',
    'איך ל'
  ]

  return videos.filter(video => {
    const title = video.title.toLowerCase()
    const channel = video.channelTitle.toLowerCase()

    // Exclude if title contains exclude keywords
    const hasExcludeKeyword = excludeKeywords.some(keyword =>
      title.includes(keyword)
    )

    if (hasExcludeKeyword) {
      return false
    }

    // Extract main event keywords (remove common words)
    const eventKeywords = eventName
      .replace(/הצגה|הצגת|מופע|כרטיסים|לילדים|ילדים/g, '')
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 2)

    // Keep if event keywords or performer name in title or channel
    const hasEventKeywords = eventKeywords.some(keyword =>
      title.includes(keyword) || channel.includes(keyword)
    )

    const hasPerformerName = performerName && (
      title.includes(performerName) || channel.includes(performerName)
    )

    return hasEventKeywords || hasPerformerName
  })
}

/**
 * Find videos for an event
 */
export async function findEventVideos(event: Event): Promise<YouTubeVideo[]> {
  // Check cache first
  const cached = await prisma.youTubeVideo.findMany({
    where: {
      eventId: event.id,
      expiresAt: {
        gt: new Date()
      }
    }
  })

  if (cached.length > 0) {
    console.log(`Using cached YouTube results for event ${event.id}`)
    return cached.map(v => ({
      videoId: v.videoId,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      channelTitle: v.channelTitle
    }))
  }

  console.log(`Searching YouTube for: ${event.name}`)

  // Build search query
  const searchTerms = [
    event.name,
    event.performerName,
    'הצגה ילדים'
  ].filter(Boolean).join(' ')

  // Search YouTube
  const allVideos = await searchYouTube(searchTerms)

  // Filter relevant videos
  const relevantVideos = filterRelevantVideos(allVideos, event)

  console.log(`Found ${relevantVideos.length} relevant videos (${allVideos.length} total)`)

  // Cache results for 24 hours
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS)

  // Save to database
  for (const video of relevantVideos) {
    try {
      await prisma.youTubeVideo.upsert({
        where: {
          eventId_videoId: {
            eventId: event.id,
            videoId: video.videoId
          }
        },
        create: {
          eventId: event.id,
          videoId: video.videoId,
          title: video.title,
          thumbnailUrl: video.thumbnailUrl,
          channelTitle: video.channelTitle,
          expiresAt
        },
        update: {
          title: video.title,
          thumbnailUrl: video.thumbnailUrl,
          channelTitle: video.channelTitle,
          expiresAt,
          checkedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error caching YouTube video:', error)
    }
  }

  return relevantVideos
}

/**
 * Get cached videos for an event
 */
export async function getCachedVideos(eventId: string): Promise<YouTubeVideo[]> {
  const videos = await prisma.youTubeVideo.findMany({
    where: {
      eventId,
      expiresAt: {
        gt: new Date()
      }
    }
  })

  return videos.map(v => ({
    videoId: v.videoId,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    channelTitle: v.channelTitle
  }))
}

/**
 * Generate embed URL for a video
 */
export function getEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

/**
 * Generate watch URL for a video
 */
export function getWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}
