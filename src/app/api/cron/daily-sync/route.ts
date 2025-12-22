import { NextRequest, NextResponse } from 'next/server'
import { syncEvents } from '@/services/events.service'
import { processCompetitorSearchQueue } from '@/services/competitor.service'

/**
 * Daily Sync Cron Job
 *
 * Runs daily at 2:00 AM (configured in vercel.json)
 *
 * Tasks:
 * 1. Sync events from Bravo JSON API
 * 2. Process competitor search queue (with quota management)
 * 3. Log results for monitoring
 *
 * Authentication: Requires CRON_SECRET header
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authentication check
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      )
    }

    // Vercel cron jobs send: Authorization: Bearer <CRON_SECRET>
    const expectedAuth = `Bearer ${cronSecret}`

    if (authHeader !== expectedAuth) {
      console.warn('Unauthorized cron job attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🚀 Starting daily sync job...')

    // Step 1: Sync events from Bravo
    console.log('📥 Step 1: Syncing events from Bravo...')
    const eventSyncResult = await syncEvents()
    console.log('✅ Event sync completed:', eventSyncResult)

    // Step 2: Process competitor search queue
    console.log('🔍 Step 2: Processing competitor search queue...')
    const competitorResult = await processCompetitorSearchQueue()
    console.log('✅ Competitor search completed:', competitorResult)

    // Calculate total duration
    const duration = Date.now() - startTime
    const durationSeconds = (duration / 1000).toFixed(2)

    // Prepare response
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${durationSeconds}s`,
      eventSync: {
        total: eventSyncResult.eventsTotal,
        new: eventSyncResult.eventsNew,
        updated: eventSyncResult.eventsUpdated,
        removed: eventSyncResult.eventsRemoved
      },
      competitorSearch: {
        processed: competitorResult.processed,
        queriesUsed: competitorResult.queriesUsed || 0,
        remaining: competitorResult.remaining || 0
      }
    }

    console.log('🎉 Daily sync job completed successfully')
    console.log(`   Duration: ${durationSeconds}s`)
    console.log(`   Events: ${eventSyncResult.eventsNew} new, ${eventSyncResult.eventsUpdated} updated, ${eventSyncResult.eventsRemoved} removed`)
    console.log(`   Competitors: ${competitorResult.processed} events processed, ${competitorResult.queriesUsed} queries used`)

    return NextResponse.json(result)

  } catch (error) {
    const duration = Date.now() - startTime
    const durationSeconds = (duration / 1000).toFixed(2)

    console.error('❌ Daily sync job failed:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        duration: `${durationSeconds}s`,
        error: errorMessage,
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for manual trigger (same logic as GET)
 * Useful for testing or manual runs
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
