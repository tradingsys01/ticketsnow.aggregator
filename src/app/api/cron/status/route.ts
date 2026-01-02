import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getDailyQueryCount } from '@/services/competitor.service'

// Disable caching for this endpoint - always return fresh data
export const dynamic = 'force-dynamic'

/**
 * Cron Job Status & Monitoring Endpoint
 *
 * Returns:
 * - Last sync results
 * - Daily quota usage
 * - Recent sync history
 * - System health metrics
 *
 * This endpoint is public (no auth required) for monitoring purposes
 */
export async function GET(request: NextRequest) {
  try {
    // Get last sync log
    const lastSync = await prisma.syncLog.findFirst({
      orderBy: {
        syncedAt: 'desc'
      }
    })

    // Get last 10 sync logs for history
    const recentSyncs = await prisma.syncLog.findMany({
      orderBy: {
        syncedAt: 'desc'
      },
      take: 10
    })

    // Get search logs for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const searchLogs = await prisma.searchLog.findMany({
      where: {
        date: {
          gte: today
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Calculate daily quota usage
    const dailyQueryCount = await getDailyQueryCount()
    const maxDailyQueries = 100
    const quotaPercentage = (dailyQueryCount / maxDailyQueries * 100).toFixed(1)

    // Get event counts
    const totalEvents = await prisma.event.count({
      where: { isKidsEvent: true }
    })

    const upcomingEvents = await prisma.event.count({
      where: {
        isKidsEvent: true,
        date: {
          gte: new Date()
        }
      }
    })

    // Get competitor match stats
    const competitorMatches = await prisma.competitorMatch.count({
      where: {
        expiresAt: {
          gt: new Date()
        }
      }
    })

    // Calculate sync success rate from last 10 syncs
    const successCount = recentSyncs.filter(s => s.status === 'success').length
    const successRate = recentSyncs.length > 0
      ? ((successCount / recentSyncs.length) * 100).toFixed(1)
      : '0.0'

    // Prepare response
    const status = {
      systemStatus: 'healthy',
      timestamp: new Date().toISOString(),

      lastSync: lastSync ? {
        syncedAt: lastSync.syncedAt.toISOString(),
        status: lastSync.status,
        eventsTotal: lastSync.eventsTotal,
        eventsNew: lastSync.eventsNew,
        eventsUpdated: lastSync.eventsUpdated,
        eventsRemoved: lastSync.eventsRemoved,
        errorMessage: lastSync.errorMessage
      } : null,

      database: {
        totalEvents,
        upcomingEvents,
        competitorMatchesCached: competitorMatches
      },

      quota: {
        dailyQueryCount,
        maxDailyQueries,
        quotaUsed: `${quotaPercentage}%`,
        remaining: maxDailyQueries - dailyQueryCount
      },

      metrics: {
        successRate: `${successRate}%`,
        last10Syncs: recentSyncs.length,
        successfulSyncs: successCount,
        failedSyncs: recentSyncs.length - successCount
      },

      recentActivity: {
        syncs: recentSyncs.map(sync => ({
          syncedAt: sync.syncedAt.toISOString(),
          status: sync.status,
          eventsNew: sync.eventsNew,
          eventsUpdated: sync.eventsUpdated,
          errorMessage: sync.errorMessage
        })),
        searchLogs: searchLogs.map(log => ({
          date: log.date.toISOString(),
          queryType: log.queryType,
          queriesUsed: log.queriesUsed
        }))
      }
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error('Error fetching cron status:', error)

    return NextResponse.json(
      {
        systemStatus: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
