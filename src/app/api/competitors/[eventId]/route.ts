import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { findCompetitorMatches, getCachedCompetitors } from '@/services/competitor.service'

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
    const cached = await getCachedCompetitors(eventId)

    if (cached.length > 0) {
      return NextResponse.json({
        competitors: cached.map(c => ({
          name: c.competitorName,
          url: c.competitorUrl,
          matchScore: c.matchScore
        })),
        fromCache: true,
        checkedAt: cached[0].checkedAt.toISOString()
      })
    }

    // Check if credentials are configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_PATH || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
      return NextResponse.json({
        competitors: [],
        fromCache: false,
        message: 'Competitor search not configured (credentials missing)'
      })
    }

    // Search for competitors
    try {
      const matches = await findCompetitorMatches(event)

      return NextResponse.json({
        competitors: matches,
        fromCache: false,
        checkedAt: new Date().toISOString()
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('quota')) {
        return NextResponse.json({
          competitors: [],
          fromCache: false,
          message: 'Daily search quota exceeded. Try again tomorrow.'
        })
      }
      throw error
    }

  } catch (error) {
    console.error('Error fetching competitors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch competitors' },
      { status: 500 }
    )
  }
}
