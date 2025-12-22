import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { findEventVideos, getCachedVideos, getEmbedUrl } from '@/services/youtube.service'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params

    // Get event from database
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check for cached results first
    const cached = await getCachedVideos(eventId)

    if (cached.length > 0) {
      return NextResponse.json({
        videos: cached.map(v => ({
          videoId: v.videoId,
          title: v.title,
          thumbnailUrl: v.thumbnailUrl,
          channelTitle: v.channelTitle,
          embedUrl: getEmbedUrl(v.videoId)
        })),
        fromCache: true
      })
    }

    // Check if service account is configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
      return NextResponse.json({
        videos: [],
        fromCache: false,
        message: 'YouTube search not configured (service account missing)'
      })
    }

    // Search for videos
    try {
      const videos = await findEventVideos(event)

      return NextResponse.json({
        videos: videos.map(v => ({
          videoId: v.videoId,
          title: v.title,
          thumbnailUrl: v.thumbnailUrl,
          channelTitle: v.channelTitle,
          embedUrl: getEmbedUrl(v.videoId)
        })),
        fromCache: false
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('quota')) {
        return NextResponse.json({
          videos: [],
          fromCache: false,
          message: 'YouTube API quota exceeded. Try again later.'
        })
      }
      throw error
    }

  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch YouTube videos' },
      { status: 500 }
    )
  }
}
