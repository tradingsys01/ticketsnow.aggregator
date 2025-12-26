import { NextRequest, NextResponse } from 'next/server'
import { runDailySync, getEmailReportData } from '@/services/sync.service'
import { sendSyncReport } from '@/services/email.service'
import { getDebugLogs } from '@/services/competitor.service'
import { getYouTubeDebugLogs } from '@/services/youtube.service'

/**
 * Comprehensive Daily Sync Cron Job
 *
 * Runs daily at 2:00 AM (configured in vercel.json)
 *
 * Tasks:
 * 1. Sync events from Bravo JSON API
 * 2. Process competitor search queue (Google Custom Search, 100 queries/day)
 * 3. Process YouTube video search queue (YouTube Data API)
 * 4. Process YouTube comments queue (YouTube Data API)
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

    console.log('🚀 Starting comprehensive daily sync job...')

    // Run complete sync (events, competitors, videos, comments)
    const stats = await runDailySync()

    // Calculate total duration
    const duration = Date.now() - startTime
    const durationSeconds = (duration / 1000).toFixed(2)

    // Prepare response
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${durationSeconds}s`,
      ...stats
    }

    console.log('🎉 Daily sync job completed successfully')
    console.log(`   Duration: ${durationSeconds}s`)
    console.log(`   Events: ${stats.eventSync.new} new, ${stats.eventSync.updated} updated, ${stats.eventSync.removed} removed`)
    console.log(`   Competitors: ${stats.competitorSearch.processed} events, ${stats.competitorSearch.queriesUsed} queries`)
    console.log(`   YouTube Videos: ${stats.youtubeVideos.eventsProcessed} events, ${stats.youtubeVideos.videosFound} videos`)
    console.log(`   YouTube Comments: ${stats.youtubeComments.videosProcessed} videos, ${stats.youtubeComments.commentsFetched} comments`)

    // Send email report
    try {
      console.log('📧 Sending email report...')
      const emailData = await getEmailReportData(stats)

      // Collect all debug logs
      const allDebugLogs = [...getDebugLogs(), ...getYouTubeDebugLogs()]
      console.log(`   Debug logs collected: ${allDebugLogs.length} entries`)

      await sendSyncReport({
        success: true,
        timestamp: new Date().toISOString(),
        duration: `${durationSeconds}s`,
        eventSync: {
          ...stats.eventSync,
          newEventsList: emailData.newEventsList
        },
        competitorSearch: {
          ...stats.competitorSearch,
          topMatches: emailData.topMatches
        },
        youtubeVideos: {
          ...stats.youtubeVideos,
          newVideos: emailData.newVideos
        },
        youtubeComments: {
          ...stats.youtubeComments,
          topComments: emailData.topComments
        },
        debugLogs: allDebugLogs
      })
      console.log('✅ Email report sent successfully')
    } catch (emailError) {
      console.error('⚠️  Failed to send email report:', emailError)
      // Don't fail the sync if email fails
    }

    return NextResponse.json(result)

  } catch (error) {
    const duration = Date.now() - startTime
    const durationSeconds = (duration / 1000).toFixed(2)

    console.error('❌ Daily sync job failed:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Send error email report
    try {
      console.log('📧 Sending error email report...')
      // Include any debug logs collected before the error
      const allDebugLogs = [...getDebugLogs(), ...getYouTubeDebugLogs()]
      await sendSyncReport({
        success: false,
        timestamp: new Date().toISOString(),
        duration: `${durationSeconds}s`,
        eventSync: { total: 0, new: 0, updated: 0, removed: 0 },
        competitorSearch: { processed: 0, queriesUsed: 0, remaining: 0, matchesFound: 0 },
        youtubeVideos: { eventsProcessed: 0, videosFound: 0, cacheHits: 0 },
        youtubeComments: { videosProcessed: 0, commentsFetched: 0, cacheHits: 0 },
        errors: [errorMessage],
        debugLogs: allDebugLogs
      })
      console.log('✅ Error email report sent')
    } catch (emailError) {
      console.error('⚠️  Failed to send error email:', emailError)
    }

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
