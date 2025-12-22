// Test file to verify database connection
// Run: npx tsx src/lib/__test_db.ts

import prisma from './db'

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...')

    // Test 1: Count events
    const eventCount = await prisma.event.count()
    console.log('✅ Event table accessible:', eventCount, 'events')

    // Test 2: Count competitors
    const competitorCount = await prisma.competitorMatch.count()
    console.log('✅ CompetitorMatch table accessible:', competitorCount, 'matches')

    // Test 3: Count YouTube videos
    const videoCount = await prisma.youTubeVideo.count()
    console.log('✅ YouTubeVideo table accessible:', videoCount, 'videos')

    // Test 4: Count search logs
    const searchLogCount = await prisma.searchLog.count()
    console.log('✅ SearchLog table accessible:', searchLogCount, 'logs')

    // Test 5: Count sync logs
    const syncLogCount = await prisma.syncLog.count()
    console.log('✅ SyncLog table accessible:', syncLogCount, 'logs')

    console.log('\n🎉 All database tables verified successfully!')

  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()
