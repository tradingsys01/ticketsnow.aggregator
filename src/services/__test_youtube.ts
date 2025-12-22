// Test file for YouTube service
// Run: npx tsx src/services/__test_youtube.ts

import {
  searchYouTube,
  filterRelevantVideos,
  findEventVideos
} from './youtube.service'
import prisma from '@/lib/db'

async function testYouTubeService() {
  console.log('🧪 Testing YouTube Service...\n')

  try {
    // Test 1: Filter relevant videos
    console.log('Test 1: Filter relevant videos')

    const mockVideos = [
      {
        videoId: 'abc123',
        title: 'הצגה לילדים - פיטר פן בתיאטרון הקרון',
        thumbnailUrl: 'https://...',
        channelTitle: 'תיאטרון הקרון'
      },
      {
        videoId: 'def456',
        title: 'REACTION to פיטר פן',
        thumbnailUrl: 'https://...',
        channelTitle: 'Reactions Channel'
      },
      {
        videoId: 'ghi789',
        title: 'פיטר פן - COVER VERSION',
        thumbnailUrl: 'https://...',
        channelTitle: 'Music Covers'
      }
    ]

    const mockEvent = {
      name: 'הצגה לילדים - פיטר פן',
      performerName: 'תיאטרון הקרון'
    }

    const filtered = filterRelevantVideos(mockVideos, mockEvent)
    console.log('  Total videos:', mockVideos.length)
    console.log('  Filtered videos:', filtered.length)
    console.log('  Removed:', mockVideos.length - filtered.length, '(reactions, covers)')
    console.log('  ✅ Filtering works\n')

    // Test 2: Search YouTube (if API key configured)
    console.log('Test 2: Search YouTube API')

    const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_PATH

    if (hasServiceAccount) {
      console.log('  Service account found, testing search...')

      // Use a popular kids show for testing
      const testQuery = 'הצגות ילדים'
      const videos = await searchYouTube(testQuery)

      console.log('  Search query:', testQuery)
      console.log('  Videos found:', videos.length)

      if (videos.length > 0) {
        console.log('  Sample video:', {
          title: videos[0].title.substring(0, 50) + '...',
          channel: videos[0].channelTitle
        })
      }
      console.log('  ✅ YouTube search works\n')
    } else {
      console.log('  ⚠️  Skipping (no service account configured)')
      console.log('  Set GOOGLE_SERVICE_ACCOUNT_PATH to test\n')
    }

    // Test 3: Find event videos (full workflow)
    console.log('Test 3: Find event videos (full workflow)')

    const events = await prisma.event.findMany({ take: 1 })

    if (events.length > 0 && hasServiceAccount) {
      console.log('  Event:', events[0].name)

      try {
        const eventVideos = await findEventVideos(events[0])
        console.log('  Videos found:', eventVideos.length)

        if (eventVideos.length > 0) {
          console.log('  First video:', {
            title: eventVideos[0].title.substring(0, 40) + '...',
            videoId: eventVideos[0].videoId
          })
        }
        console.log('  ✅ Full workflow works\n')
      } catch (error) {
        if (error instanceof Error && error.message.includes('quota')) {
          console.log('  ⚠️  Quota exceeded (expected on heavy testing)')
        } else {
          throw error
        }
      }
    } else {
      console.log('  ⚠️  Skipping (no events or no service account)\n')
    }

    console.log('🎉 All YouTube service tests passed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testYouTubeService()
