import { PrismaClient } from '@prisma/client'
import { findCompetitorMatches } from '../src/services/competitor.service'

const prisma = new PrismaClient()

// Old competitors that were removed
const OLD_COMPETITORS = ['Ticketsi', 'Youticket']

async function reindexCompetitors() {
  console.log('🔍 Starting competitor reindexing process...\n')

  try {
    // Step 1: Find all events with old competitor matches
    console.log('Step 1: Finding events with old competitor matches...')
    const oldMatches = await prisma.competitorMatch.findMany({
      where: {
        competitorName: {
          in: OLD_COMPETITORS
        }
      },
      select: {
        id: true,
        eventId: true,
        competitorName: true,
        competitorUrl: true,
        matchScore: true,
        event: {
          select: {
            id: true,
            name: true,
            date: true
          }
        }
      }
    })

    const uniqueEventIds = [...new Set(oldMatches.map(m => m.eventId))]

    console.log(`\nFound ${oldMatches.length} old competitor matches across ${uniqueEventIds.length} events:`)

    // Group by competitor name
    const matchesByCompetitor = OLD_COMPETITORS.map(name => ({
      name,
      count: oldMatches.filter(m => m.competitorName === name).length
    }))

    matchesByCompetitor.forEach(({ name, count }) => {
      console.log(`  - ${name}: ${count} matches`)
    })

    if (uniqueEventIds.length === 0) {
      console.log('\n✅ No events found with old competitor data. Nothing to reindex.')
      return {
        eventsProcessed: 0,
        oldMatchesRemoved: 0,
        newMatchesFound: 0,
        errors: 0
      }
    }

    // Step 2: Fetch full event details
    console.log('\nStep 2: Fetching event details...')
    const events = await prisma.event.findMany({
      where: {
        id: {
          in: uniqueEventIds
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    console.log(`Retrieved ${events.length} events for reindexing`)

    // Step 3: Delete old competitor matches
    console.log('\nStep 3: Removing old competitor matches...')
    const deleteResult = await prisma.competitorMatch.deleteMany({
      where: {
        competitorName: {
          in: OLD_COMPETITORS
        }
      }
    })

    console.log(`✅ Deleted ${deleteResult.count} old competitor matches`)

    // Step 4: Re-search with new competitors
    console.log('\nStep 4: Re-searching with new competitors...')
    console.log('⚠️  Note: This will use Google Search API quota (4 searches per event)\n')

    let successCount = 0
    let errorCount = 0
    let totalNewMatches = 0
    const results: any[] = []

    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      const progress = `[${i + 1}/${events.length}]`

      try {
        console.log(`${progress} Searching: ${event.name.substring(0, 50)}...`)

        const matches = await findCompetitorMatches(event)

        totalNewMatches += matches.length
        successCount++

        results.push({
          eventId: event.id,
          eventName: event.name,
          date: event.date,
          newMatches: matches.length,
          competitors: matches.map(m => m.competitorName)
        })

        console.log(`   ✓ Found ${matches.length} new matches: ${matches.map(m => m.competitorName).join(', ') || 'none'}`)

      } catch (error: any) {
        errorCount++
        console.error(`   ✗ Error: ${error.message}`)

        results.push({
          eventId: event.id,
          eventName: event.name,
          date: event.date,
          error: error.message
        })
      }

      // Small delay to avoid rate limiting
      if (i < events.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Step 5: Generate report
    console.log('\n' + '='.repeat(80))
    console.log('📊 REINDEXING REPORT')
    console.log('='.repeat(80))

    console.log('\n📈 Summary:')
    console.log(`  Events processed: ${events.length}`)
    console.log(`  Successfully reindexed: ${successCount}`)
    console.log(`  Errors: ${errorCount}`)
    console.log(`  Old matches removed: ${deleteResult.count}`)
    console.log(`  New matches found: ${totalNewMatches}`)
    console.log(`  Net change: ${totalNewMatches - deleteResult.count > 0 ? '+' : ''}${totalNewMatches - deleteResult.count}`)

    console.log('\n📋 Old Competitor Breakdown:')
    matchesByCompetitor.forEach(({ name, count }) => {
      console.log(`  - ${name}: ${count} matches removed`)
    })

    console.log('\n📋 Events with New Matches:')
    const eventsWithMatches = results.filter(r => !r.error && r.newMatches > 0)
    if (eventsWithMatches.length > 0) {
      eventsWithMatches.forEach(r => {
        console.log(`  - ${r.eventName}`)
        console.log(`    Date: ${new Date(r.date).toLocaleDateString('he-IL')}`)
        console.log(`    Matches: ${r.competitors.join(', ')}`)
      })
    } else {
      console.log('  (None)')
    }

    console.log('\n📋 Events with No Matches:')
    const eventsWithoutMatches = results.filter(r => !r.error && r.newMatches === 0)
    if (eventsWithoutMatches.length > 0) {
      eventsWithoutMatches.slice(0, 10).forEach(r => {
        console.log(`  - ${r.eventName}`)
      })
      if (eventsWithoutMatches.length > 10) {
        console.log(`  ... and ${eventsWithoutMatches.length - 10} more`)
      }
    } else {
      console.log('  (None)')
    }

    if (errorCount > 0) {
      console.log('\n⚠️  Errors:')
      const errored = results.filter(r => r.error)
      errored.forEach(r => {
        console.log(`  - ${r.eventName}: ${r.error}`)
      })
    }

    console.log('\n' + '='.repeat(80))

    return {
      eventsProcessed: events.length,
      oldMatchesRemoved: deleteResult.count,
      newMatchesFound: totalNewMatches,
      errors: errorCount,
      results
    }

  } catch (error) {
    console.error('❌ Fatal error during reindexing:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
reindexCompetitors()
  .then((result) => {
    console.log('\n✅ Reindexing completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Reindexing failed:', error)
    process.exit(1)
  })
