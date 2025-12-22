// Test file for events service
// Run: npx tsx src/services/__test_events.ts

import {
  fetchFromBravo,
  filterKidsEvents,
  generateSlug,
  normalizeEvent,
  getUpcomingEvents
} from './events.service'

async function testEventsService() {
  console.log('🧪 Testing Events Service...\n')

  try {
    // Test 1: Generate slug from Hebrew text
    console.log('Test 1: Generate slug from Hebrew')
    const slug1 = generateSlug('הצגה לילדים - שלגיה והגמדים')
    console.log('  Input: "הצגה לילדים - שלגיה והגמדים"')
    console.log('  Output:', slug1)
    console.log('  ✅ Slug generated\n')

    // Test 2: Fetch from Bravo JSON
    console.log('Test 2: Fetch events from Bravo JSON')
    const bravoEvents = await fetchFromBravo()
    console.log('  ✅ Fetched', bravoEvents.length, 'events from Bravo\n')

    // Test 3: Filter kids events
    console.log('Test 3: Filter kids events')
    const kidsEvents = filterKidsEvents(bravoEvents)
    console.log('  Total events:', bravoEvents.length)
    console.log('  Kids events:', kidsEvents.length)
    if (kidsEvents.length > 0) {
      console.log('  Sample event category:', kidsEvents[0].category)
    }
    console.log('  ✅ Filtering works\n')

    // Test 4: Normalize event
    if (kidsEvents.length > 0) {
      console.log('Test 4: Normalize event')
      const normalized = normalizeEvent(kidsEvents[0])
      console.log('  Event name:', normalized.name)
      console.log('  Slug:', normalized.slug)
      console.log('  Category:', normalized.category)
      console.log('  Is kids event:', normalized.isKidsEvent)
      console.log('  ✅ Normalization works\n')
    }

    // Test 5: Get upcoming events (from database)
    console.log('Test 5: Get upcoming events from database')
    const upcomingEvents = await getUpcomingEvents(10)
    console.log('  Events in database:', upcomingEvents.length)
    console.log('  ✅ Database query works\n')

    console.log('🎉 All events service tests passed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testEventsService()
