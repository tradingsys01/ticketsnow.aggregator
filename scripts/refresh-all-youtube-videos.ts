import { PrismaClient } from '@prisma/client'
import { findEventVideos } from '../src/services/youtube.service'

const prisma = new PrismaClient()

async function refreshAllYouTubeVideos() {
  console.log('🔍 Refreshing YouTube videos for ALL events...\n')

  try {
    // Get all events
    const events = await prisma.event.findMany({
      where: {
        isKidsEvent: true
      },
      orderBy: {
        date: 'asc'
      }
    })

    console.log(`Found ${events.length} events to process\n`)

    // Delete all cached YouTube videos
    console.log('🗑️  Clearing all cached YouTube videos...')
    const deleteResult = await prisma.youTubeVideo.deleteMany({})
    console.log(`Deleted ${deleteResult.count} cached videos\n`)

    let successCount = 0
    let errorCount = 0
    let totalVideos = 0
    let videosFromPrimaryChannel = 0
    const results: any[] = []

    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      const progress = `[${i + 1}/${events.length}]`

      try {
        console.log(`${progress} ${event.name.substring(0, 60)}...`)

        const videos = await findEventVideos(event)

        totalVideos += videos.length
        const primaryChannelVideos = videos.filter(v => v.channelTitle.includes('כרטיסים עכשיו'))
        videosFromPrimaryChannel += primaryChannelVideos.length

        if (videos.length > 0) {
          console.log(`  ✓ Found ${videos.length} videos (${primaryChannelVideos.length} from primary channel)`)
          if (primaryChannelVideos.length > 0) {
            primaryChannelVideos.forEach(v => {
              console.log(`    - ${v.title}`)
            })
          }
        } else {
          console.log(`  ○ No videos found`)
        }

        results.push({
          eventId: event.id,
          eventName: event.name,
          date: event.date,
          videosFound: videos.length,
          fromPrimaryChannel: primaryChannelVideos.length,
          videos: videos.map(v => ({
            title: v.title,
            videoId: v.videoId,
            channel: v.channelTitle
          }))
        })

        successCount++

      } catch (error: any) {
        errorCount++
        console.error(`  ✗ Error: ${error.message}`)

        results.push({
          eventId: event.id,
          eventName: event.name,
          error: error.message
        })
      }

      // Small delay to avoid rate limiting
      if (i < events.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    // Generate report
    console.log('\n' + '='.repeat(80))
    console.log('📊 YOUTUBE VIDEO REFRESH REPORT')
    console.log('='.repeat(80))

    console.log('\n📈 Summary:')
    console.log(`  Events processed: ${events.length}`)
    console.log(`  Successfully processed: ${successCount}`)
    console.log(`  Errors: ${errorCount}`)
    console.log(`  Total videos found: ${totalVideos}`)
    console.log(`  Videos from @ticketsnowcoil: ${videosFromPrimaryChannel}`)
    console.log(`  Events with videos: ${results.filter(r => !r.error && r.videosFound > 0).length}`)
    console.log(`  Events without videos: ${results.filter(r => !r.error && r.videosFound === 0).length}`)

    console.log('\n📋 Events with Primary Channel Videos:')
    const primaryChannelEvents = results.filter(r => !r.error && r.fromPrimaryChannel > 0)
    if (primaryChannelEvents.length > 0) {
      primaryChannelEvents.forEach(r => {
        console.log(`  ✓ ${r.eventName}`)
        console.log(`    Found ${r.fromPrimaryChannel} video(s) from @ticketsnowcoil`)
        r.videos
          .filter((v: any) => v.channel.includes('כרטיסים עכשיו'))
          .forEach((v: any) => {
            console.log(`      - ${v.title} (${v.videoId})`)
          })
      })
    } else {
      console.log('  (None)')
    }

    console.log('\n📋 Events with Videos from Other Channels:')
    const otherChannelEvents = results.filter(r => !r.error && r.videosFound > 0 && r.fromPrimaryChannel === 0)
    if (otherChannelEvents.length > 0) {
      otherChannelEvents.slice(0, 10).forEach(r => {
        console.log(`  - ${r.eventName}`)
        console.log(`    Channel: ${r.videos[0].channel}`)
      })
      if (otherChannelEvents.length > 10) {
        console.log(`  ... and ${otherChannelEvents.length - 10} more`)
      }
    } else {
      console.log('  (None)')
    }

    console.log('\n📋 Events with No Videos:')
    const noVideoEvents = results.filter(r => !r.error && r.videosFound === 0)
    if (noVideoEvents.length > 0) {
      noVideoEvents.slice(0, 10).forEach(r => {
        console.log(`  - ${r.eventName}`)
      })
      if (noVideoEvents.length > 10) {
        console.log(`  ... and ${noVideoEvents.length - 10} more`)
      }
    } else {
      console.log('  (All events have videos!)')
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
      videosFound: totalVideos,
      primaryChannelVideos: videosFromPrimaryChannel,
      errors: errorCount,
      results
    }

  } catch (error) {
    console.error('❌ Fatal error during refresh:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
refreshAllYouTubeVideos()
  .then((result) => {
    console.log('\n✅ YouTube video refresh completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Refresh failed:', error)
    process.exit(1)
  })
