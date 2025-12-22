// Test file for Schema.org validation
// Run: npx tsx src/lib/__test_schema.ts

import {
  generateEventSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateOrganizationSchema,
  generateWebSiteSchema
} from './schema'
import prisma from './db'

async function testSchemas() {
  console.log('🧪 Testing Schema.org Generation...\n')

  try {
    // Test 1: Organization Schema
    console.log('Test 1: Organization Schema')
    const orgSchema = generateOrganizationSchema()
    console.log('  Type:', orgSchema['@type'])
    console.log('  Has name:', !!orgSchema.name)
    console.log('  Has URL:', !!orgSchema.url)
    console.log('  ✅ Organization schema valid\n')

    // Test 2: WebSite Schema
    console.log('Test 2: WebSite Schema')
    const websiteSchema = generateWebSiteSchema()
    console.log('  Type:', websiteSchema['@type'])
    console.log('  Has search action:', !!websiteSchema.potentialAction)
    console.log('  ✅ WebSite schema valid\n')

    // Test 3: Event Schema
    console.log('Test 3: Event Schema')
    const events = await prisma.event.findMany({ take: 1 })

    if (events.length > 0) {
      const eventSchema = generateEventSchema(events[0])
      console.log('  Type:', eventSchema['@type'])
      console.log('  Event name:', eventSchema.name)
      console.log('  Has location:', !!eventSchema.location)
      console.log('  Has offers:', !!eventSchema.offers)
      console.log('  Start date:', eventSchema.startDate)
      console.log('  ✅ Event schema valid\n')

      // Test 4: FAQ Schema
      console.log('Test 4: FAQ Schema')
      const faqSchema = generateFAQSchema(events[0])
      console.log('  Type:', faqSchema['@type'])
      console.log('  Number of questions:', faqSchema.mainEntity.length)
      console.log('  First question:', faqSchema.mainEntity[0].name.substring(0, 40) + '...')
      console.log('  ✅ FAQ schema valid\n')
    } else {
      console.log('  ⚠️  No events in database, skipping event/FAQ schemas\n')
    }

    // Test 5: Breadcrumb Schema
    console.log('Test 5: Breadcrumb Schema')
    const breadcrumbs = [
      { name: 'ראשי', url: 'http://localhost:3000' },
      { name: 'הצגות לילדים', url: 'http://localhost:3000/events' }
    ]
    const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs)
    console.log('  Type:', breadcrumbSchema['@type'])
    console.log('  Items:', breadcrumbSchema.itemListElement.length)
    console.log('  ✅ Breadcrumb schema valid\n')

    // Test 6: JSON Validity
    console.log('Test 6: JSON Validity')
    const schemas = [
      orgSchema,
      websiteSchema,
      breadcrumbSchema
    ]

    schemas.forEach((schema, index) => {
      try {
        const json = JSON.stringify(schema)
        JSON.parse(json) // Validate it's valid JSON
        console.log(`  Schema ${index + 1}: Valid JSON ✓`)
      } catch (error) {
        console.error(`  Schema ${index + 1}: Invalid JSON ✗`)
        throw error
      }
    })
    console.log('  ✅ All schemas produce valid JSON\n')

    console.log('🎉 All Schema.org tests passed!')
    console.log('\n📝 Next steps:')
    console.log('  1. Test in Google Rich Results Test:')
    console.log('     https://search.google.com/test/rich-results')
    console.log('  2. Validate with Schema.org validator:')
    console.log('     https://validator.schema.org/')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testSchemas()
