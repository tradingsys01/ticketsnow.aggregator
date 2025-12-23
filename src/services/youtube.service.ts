import { google } from 'googleapis'
import prisma from '@/lib/db'
import type { Event } from '@prisma/client'
import { GoogleAuth } from 'google-auth-library'
import * as fs from 'fs'
import * as path from 'path'

const GOOGLE_SERVICE_ACCOUNT_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
const CACHE_DURATION_HOURS = 24
const PRIMARY_CHANNEL_HANDLE = '@ticketsnowcoil' // Primary channel to search first

// OAuth2 credentials for YouTube comments
const YOUTUBE_OAUTH_CLIENT_ID = process.env.YOUTUBE_OAUTH_CLIENT_ID
const YOUTUBE_OAUTH_CLIENT_SECRET = process.env.YOUTUBE_OAUTH_CLIENT_SECRET
const YOUTUBE_OAUTH_REDIRECT_URI = process.env.YOUTUBE_OAUTH_REDIRECT_URI
const YOUTUBE_OAUTH_REFRESH_TOKEN = process.env.YOUTUBE_OAUTH_REFRESH_TOKEN

// Initialize Google Auth
let googleAuth: GoogleAuth | null = null
let oauth2Client: any = null

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

/**
 * Get OAuth2 client for YouTube comments
 * Comments require OAuth2, not service account
 */
function getOAuth2Client() {
  if (!oauth2Client) {
    if (!YOUTUBE_OAUTH_CLIENT_ID || !YOUTUBE_OAUTH_CLIENT_SECRET || !YOUTUBE_OAUTH_REFRESH_TOKEN) {
      throw new Error('YouTube OAuth2 credentials not configured. Run: node scripts/generate-youtube-token.js')
    }

    const { OAuth2Client } = require('google-auth-library')

    oauth2Client = new OAuth2Client(
      YOUTUBE_OAUTH_CLIENT_ID,
      YOUTUBE_OAUTH_CLIENT_SECRET,
      YOUTUBE_OAUTH_REDIRECT_URI
    )

    // Set refresh token
    oauth2Client.setCredentials({
      refresh_token: YOUTUBE_OAUTH_REFRESH_TOKEN
    })
  }

  return oauth2Client
}

interface YouTubeVideo {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
}

/**
 * Get channel ID from channel handle
 */
async function getChannelIdFromHandle(handle: string): Promise<string | null> {
  try {
    const auth = getGoogleAuth()
    const authClient = await auth.getClient()
    const youtube = google.youtube({
      version: 'v3',
      auth: authClient as any
    })

    // Search for the channel
    const response = await youtube.search.list({
      part: ['snippet'],
      q: handle,
      type: ['channel'],
      maxResults: 1
    })

    if (response.data.items && response.data.items.length > 0) {
      return response.data.items[0].id?.channelId || null
    }

    return null
  } catch (error) {
    console.error(`Error getting channel ID for ${handle}:`, error)
    return null
  }
}

/**
 * Search YouTube for videos (optionally within a specific channel)
 */
export async function searchYouTube(query: string, channelId?: string): Promise<YouTubeVideo[]> {
  try {
    // Get authenticated client
    const auth = getGoogleAuth()
    const authClient = await auth.getClient()

    // Create YouTube API client
    const youtube = google.youtube({
      version: 'v3',
      auth: authClient as any
    })

    // Build search parameters
    const searchParams: any = {
      part: ['snippet'],
      q: query,
      type: ['video'],
      maxResults: 5,
      videoEmbeddable: 'true',
      relevanceLanguage: 'he',
      safeSearch: 'strict'
    }

    // Add channel filter if provided
    if (channelId) {
      searchParams.channelId = channelId
      // Don't filter by duration when searching within a specific channel
    } else {
      // Only filter by duration for general search
      searchParams.videoDuration = 'medium' // 4-20 minutes
    }

    // Search for videos
    const response = await youtube.search.list(searchParams)

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
 * Search YouTube with channel priority (primary channel first, then fallback to general search)
 */
export async function searchYouTubeWithFallback(query: string): Promise<YouTubeVideo[]> {
  try {
    // First, try to get videos from the primary channel
    console.log(`Searching ${PRIMARY_CHANNEL_HANDLE} for: ${query}`)
    const channelId = await getChannelIdFromHandle(PRIMARY_CHANNEL_HANDLE)

    if (channelId) {
      const channelVideos = await searchYouTube(query, channelId)

      if (channelVideos.length > 0) {
        console.log(`Found ${channelVideos.length} videos on ${PRIMARY_CHANNEL_HANDLE}`)
        return channelVideos
      }
    }

    // Fallback to general YouTube search
    console.log('No videos found on primary channel, falling back to general YouTube search')
    const generalVideos = await searchYouTube(query)
    console.log(`Found ${generalVideos.length} videos in general search`)

    return generalVideos

  } catch (error) {
    console.error('Error in searchYouTubeWithFallback:', error)
    // If all fails, try basic search
    return searchYouTube(query)
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

  // Search YouTube (primary channel first, then fallback to general search)
  const allVideos = await searchYouTubeWithFallback(searchTerms)

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

/**
 * Fetch comments for a YouTube video
 */
export async function fetchVideoComments(videoId: string, maxResults: number = 10): Promise<any[]> {
  try {
    // Use OAuth2 for comments (service accounts don't have permission)
    const authClient = getOAuth2Client()
    const youtube = google.youtube({
      version: 'v3',
      auth: authClient
    })

    // Fetch comment threads (top-level comments with replies)
    const response = await youtube.commentThreads.list({
      part: ['snippet', 'replies'],
      videoId: videoId,
      maxResults: maxResults,
      order: 'relevance', // Get most relevant comments first
      textFormat: 'plainText'
    })

    if (!response.data.items) {
      return []
    }

    const comments = []

    for (const item of response.data.items) {
      const topComment = item.snippet?.topLevelComment?.snippet
      if (!topComment) continue

      // Add top-level comment
      comments.push({
        commentId: item.snippet?.topLevelComment?.id || '',
        authorName: topComment.authorDisplayName || 'Unknown',
        authorChannelId: topComment.authorChannelId?.value || null,
        authorProfileUrl: topComment.authorProfileImageUrl || null,
        textDisplay: topComment.textDisplay || '',
        likeCount: topComment.likeCount || 0,
        publishedAt: new Date(topComment.publishedAt || new Date()),
        updatedAt: new Date(topComment.updatedAt || new Date()),
        isReply: false,
        parentCommentId: null
      })

      // Add replies if they exist
      if (item.replies?.comments) {
        for (const reply of item.replies.comments) {
          const replySnippet = reply.snippet
          if (!replySnippet) continue

          comments.push({
            commentId: reply.id || '',
            authorName: replySnippet.authorDisplayName || 'Unknown',
            authorChannelId: replySnippet.authorChannelId?.value || null,
            authorProfileUrl: replySnippet.authorProfileImageUrl || null,
            textDisplay: replySnippet.textDisplay || '',
            likeCount: replySnippet.likeCount || 0,
            publishedAt: new Date(replySnippet.publishedAt || new Date()),
            updatedAt: new Date(replySnippet.updatedAt || new Date()),
            isReply: true,
            parentCommentId: item.snippet?.topLevelComment?.id || null
          })
        }
      }
    }

    return comments

  } catch (error) {
    console.error('Error fetching YouTube comments:', error)
    return []
  }
}

/**
 * Get comments for a video (with caching)
 */
export async function getVideoComments(videoId: string): Promise<any[]> {
  // Check cache first
  const cached = await prisma.videoComment.findMany({
    where: {
      videoId: videoId,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: [
      { isReply: 'asc' }, // Top-level comments first
      { likeCount: 'desc' }, // Then by likes
      { publishedAt: 'desc' } // Then by date
    ]
  })

  if (cached.length > 0) {
    console.log(`Using cached comments for video ${videoId}`)
    return cached
  }

  console.log(`Fetching comments for video ${videoId}`)

  // Fetch fresh comments
  const comments = await fetchVideoComments(videoId, 10)

  if (comments.length === 0) {
    return []
  }

  // Get the YouTubeVideo record to link comments
  const video = await prisma.youTubeVideo.findFirst({
    where: { videoId }
  })

  if (!video) {
    console.warn(`YouTubeVideo record not found for videoId ${videoId}`)
    return comments // Return without caching
  }

  // Cache comments for a few days
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 3) // Cache for 3 days

  // Save to database
  for (const comment of comments) {
    try {
      await prisma.videoComment.upsert({
        where: {
          commentId: comment.commentId
        },
        create: {
          youtubeVideoId: video.id,
          videoId: videoId,
          commentId: comment.commentId,
          authorName: comment.authorName,
          authorChannelId: comment.authorChannelId,
          authorProfileUrl: comment.authorProfileUrl,
          textDisplay: comment.textDisplay,
          likeCount: comment.likeCount,
          publishedAt: comment.publishedAt,
          updatedAt: comment.updatedAt,
          isReply: comment.isReply,
          parentCommentId: comment.parentCommentId,
          expiresAt
        },
        update: {
          authorName: comment.authorName,
          textDisplay: comment.textDisplay,
          likeCount: comment.likeCount,
          updatedAt: comment.updatedAt,
          expiresAt,
          checkedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error caching comment:', error)
    }
  }

  console.log(`Cached ${comments.length} comments for video ${videoId}`)

  return comments
}
