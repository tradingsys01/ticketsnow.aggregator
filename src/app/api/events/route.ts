import { NextRequest, NextResponse } from 'next/server'
import { getUpcomingEvents, getUpcomingEventsCount } from '@/services/events.service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const [events, total] = await Promise.all([
      getUpcomingEvents(limit, offset),
      getUpcomingEventsCount()
    ])

    return NextResponse.json({
      events,
      total,
      hasMore: offset + events.length < total
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
