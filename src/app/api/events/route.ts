import { NextRequest, NextResponse } from 'next/server'
import { searchEvents, getSearchResultsCount, type EventSortOption } from '@/services/events.service'

// Valid sort options
const VALID_SORTS: EventSortOption[] = ['date', 'date_desc', 'created', 'updated', 'name']

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '12')
    const offset = parseInt(searchParams.get('offset') || '0')
    const query = searchParams.get('q') || ''
    const city = searchParams.get('city') || ''
    const dateFilter = searchParams.get('date') || ''
    const sortParam = searchParams.get('sort') || 'date'

    // Validate sort parameter
    const sort: EventSortOption = VALID_SORTS.includes(sortParam as EventSortOption)
      ? sortParam as EventSortOption
      : 'date'

    const [events, total] = await Promise.all([
      searchEvents(query, limit, offset, city, dateFilter, sort),
      getSearchResultsCount(query, city, dateFilter)
    ])

    return NextResponse.json({
      events,
      total,
      hasMore: offset + events.length < total,
      offset,
      limit,
      sort
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
