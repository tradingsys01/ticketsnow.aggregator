import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EventDetails from '@/components/EventDetails'
import SchemaMarkup from '@/components/SchemaMarkup'
import { generateEventMetadata } from '@/lib/metadata'
import { generateEventSchema, generateFAQSchema, generateBreadcrumbSchema } from '@/lib/schema'
import prisma from '@/lib/db'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

interface EventPageProps {
  params: {
    slug: string
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  // Decode the slug parameter
  const decodedSlug = decodeURIComponent(params.slug)

  const event = await prisma.event.findUnique({
    where: { slug: decodedSlug }
  })

  if (!event) {
    return {
      title: 'הצגה לא נמצאה',
      description: 'ההצגה שחיפשת לא נמצאה באתר'
    }
  }

  return generateEventMetadata(event)
}

// Generate static paths for all events (for static generation)
export async function generateStaticParams() {
  const events = await prisma.event.findMany({
    where: { isKidsEvent: true },
    select: { slug: true }
  })

  return events.map((event) => ({
    slug: event.slug,
  }))
}

export default async function EventPage({ params }: EventPageProps) {
  // Decode the slug parameter (handles URL-encoded Hebrew characters)
  const decodedSlug = decodeURIComponent(params.slug)

  // Fetch event from database
  const event = await prisma.event.findUnique({
    where: { slug: decodedSlug }
  })

  // Return 404 if event not found
  if (!event) {
    notFound()
  }

  // Generate schemas for this event
  const eventSchema = generateEventSchema(event)
  const faqSchema = generateFAQSchema(event)
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'ראשי', url: SITE_URL },
    { name: 'הצגות לילדים', url: SITE_URL },
    { name: event.name, url: `${SITE_URL}/event/${event.slug}` }
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-pink-50 flex flex-col">
      <Header />

      {/* Schema Markup */}
      <SchemaMarkup schema={[eventSchema, faqSchema, breadcrumbSchema]} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-gray-600">
            <li>
              <a href="/" className="hover:text-blue-600 transition-colors">
                ראשי
              </a>
            </li>
            <li>
              <span className="text-gray-400">←</span>
            </li>
            <li>
              <a href="/#upcoming" className="hover:text-blue-600 transition-colors">
                הצגות לילדים
              </a>
            </li>
            <li>
              <span className="text-gray-400">←</span>
            </li>
            <li className="text-gray-900 font-medium" aria-current="page">
              {event.name}
            </li>
          </ol>
        </nav>

        {/* Event Details */}
        <EventDetails event={event} />

        {/* Back to Homepage */}
        <div className="mt-12 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <span>→</span>
            <span>חזרה לעמוד הראשי</span>
          </a>
        </div>
      </main>

      <Footer />
    </div>
  )
}
