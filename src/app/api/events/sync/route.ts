import { NextRequest, NextResponse } from 'next/server'
import { syncEvents } from '@/services/events.service'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('x-cron-secret')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await syncEvents()

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
