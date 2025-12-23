import { PrismaClient } from '@prisma/client'
import { findEventVideos } from '../src/services/youtube.service'

const prisma = new PrismaClient()

async function refreshVideosForEvents(eventNames: string[]) {
  console.log('🔍 Refreshing YouTube videos for specific events...\n')

  try {
    for (const eventName of eventNames) {
      console.log(`Searching for: ${eventName}`)

      // Find the event
      const event = await prisma.event.findFirst({
        where: {
          name: {
            contains: eventName
          }
        }
      })

      if (!event) {
        console.log(`  ❌ Event not found\n`)
        continue
      }

      console.log(`  Found event: ${event.name}`)
      console.log(`  Event ID: ${event.id}`)

      // Delete existing cached videos
      const deleteResult = await prisma.youTubeVideo.deleteMany({
        where: {
          eventId: event.id
        }
      })

      console.log(`  🗑️  Deleted ${deleteResult.count} cached videos`)

      // Search for new videos
      console.log(`  🔎 Searching YouTube...`)
      const videos = await findEventVideos(event)

      if (videos.length > 0) {
        console.log(`  ✅ Found ${videos.length} videos:`)
        videos.forEach(v => {
          console.log(`     - ${v.title}`)
          console.log(`       Video ID: ${v.videoId}`)
          console.log(`       Channel: ${v.channelTitle}`)
        })
      } else {
        console.log(`  ⚠️  No videos found`)
      }

      console.log()
    }

    console.log('✅ Refresh completed!')

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Events to refresh
const eventsToRefresh = [
  'כובע קסמים',
  'ספר הג\'ונגל - חברים לעולם'
]

refreshVideosForEvents(eventsToRefresh)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
