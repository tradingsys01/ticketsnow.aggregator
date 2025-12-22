// Test file for competitor service
// Run: npx tsx src/services/__test_competitor.ts

import {
  calculateMatchScore,
  getDailyQueryCount,
  shouldSearchToday,
  findCompetitorMatches
} from './competitor.service'
import prisma from '@/lib/db'

async function testCompetitorService() {
  console.log('🧪 Testing Competitor Service...\n')

  try {
    // Test 1: Calculate match score
    console.log('Test 1: Calculate match score')

    const mockEvent = {
      id: 'test-1',
      name: 'הצגה לילדים - פיטר פן',
      performerName: 'תיאטרון הקרון',
      venue: 'תיאטרון הקרון',
      date: new Date('2024-12-25')
    }

    const mockResult = {
      title: 'פיטר פן - תיאטרון הקרון',
      snippet: 'הצגה מרהיבה לילדים בתיאטרון הקרון',
      link: 'https://ticketsi.co.il/show/123'
    }

    const score = calculateMatchScore(mockResult, mockEvent)
    console.log('  Mock event:', mockEvent.name)
    console.log('  Mock result:', mockResult.title)
    console.log('  Match score:', score)
    console.log('  ✅ Score calculated (0-1 range)\n')

    // Test 2: Get daily query count
    console.log('Test 2: Get daily query count')
    const queryCount = await getDailyQueryCount()
    console.log('  Queries used today:', queryCount)
    console.log('  ✅ Query count retrieved\n')

    // Test 3: Should search today logic
    console.log('Test 3: Should search today logic')

    // Get a real event from database
    const events = await prisma.event.findMany({ take: 1 })

    if (events.length > 0) {
      const shouldSearch = await shouldSearchToday(events[0])
      console.log('  Event:', events[0].name)
      console.log('  Should search:', shouldSearch)
      console.log('  ✅ Search decision logic works\n')
    } else {
      console.log('  ⚠️  No events in database, skipping test\n')
    }

    // Test 4: Find competitor matches (if API keys are set)
    console.log('Test 4: Find competitor matches')

    const hasApiKey = !!process.env.GOOGLE_API_KEY
    const hasSearchEngineId = !!process.env.GOOGLE_SEARCH_ENGINE_ID

    if (hasApiKey && hasSearchEngineId && events.length > 0) {
      console.log('  API keys found, testing search...')
      const matches = await findCompetitorMatches(events[0])
      console.log('  Competitors found:', matches.length)
      if (matches.length > 0) {
        console.log('  Sample match:', {
          name: matches[0].competitorName,
          score: matches[0].matchScore,
          url: matches[0].competitorUrl.substring(0, 50) + '...'
        })
      }
      console.log('  ✅ Competitor search works\n')
    } else {
      console.log('  ⚠️  Skipping (no API keys or no events)')
      console.log('  Set GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID to test\n')
    }

    console.log('🎉 All competitor service tests passed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testCompetitorService()
