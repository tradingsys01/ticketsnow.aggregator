import { Suspense } from 'react'
import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EventCard from '@/components/EventCard'
import SearchBar from '@/components/SearchBar'
import Filters from '@/components/Filters'
import Pagination from '@/components/Pagination'
import SchemaMarkup from '@/components/SchemaMarkup'
import { generateItemListSchema } from '@/lib/schema'
import { searchEvents, getSearchResultsCount, getUniqueCities, type EventSortOption } from '@/services/events.service'

const ITEMS_PER_PAGE = 24

interface EventsPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export const metadata: Metadata = {
  title: 'כל ההצגות לילדים | רשימה מלאה',
  description: 'רשימה מלאה של כל ההצגות והמופעים לילדים בישראל. מידע מקיף, תאריכים, מקומות והשוואת מחירים.',
  alternates: {
    canonical: '/events'
  }
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  // Get search query and filters from URL params
  const query = typeof searchParams.q === 'string' ? searchParams.q : ''
  const city = typeof searchParams.city === 'string' ? searchParams.city : ''
  const dateFilter = typeof searchParams.date === 'string' ? searchParams.date : ''
  const sortParam = typeof searchParams.sort === 'string' ? searchParams.sort : 'date'
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1
  const currentPage = Math.max(1, page)
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  // Validate sort parameter
  const validSorts: EventSortOption[] = ['date', 'date_desc', 'created', 'updated', 'name']
  const sort: EventSortOption = validSorts.includes(sortParam as EventSortOption)
    ? sortParam as EventSortOption
    : 'date'

  // Fetch events, total count, and cities
  const [events, totalCount, cities] = await Promise.all([
    searchEvents(query, ITEMS_PER_PAGE, offset, city, dateFilter, sort),
    getSearchResultsCount(query, city, dateFilter),
    getUniqueCities()
  ])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Generate ItemList schema for SEO
  const itemListSchema = events.length > 0 ? generateItemListSchema(events) : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-pink-50 flex flex-col">
      <Header />

      {/* ItemList Schema for event listings */}
      {itemListSchema && <SchemaMarkup schema={itemListSchema} />}

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🎭 כל ההצגות לילדים 🎪
          </h1>
          <p className="text-xl text-gray-700 mb-2">
            רשימה מלאה של {totalCount} הצגות ומופעים
          </p>
          <p className="text-gray-600">
            עמוד {currentPage} מתוך {totalPages}
          </p>
        </div>

        {/* Search Bar */}
        <Suspense fallback={<div className="h-16" />}>
          <SearchBar basePath="/events" />
        </Suspense>

        {/* Filters */}
        <Suspense fallback={<div className="h-24" />}>
          <Filters cities={cities} basePath="/events" />
        </Suspense>

        {/* Event List */}
        {events.length > 0 ? (
          <>
            <section className="py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>

            {/* Pagination */}
            <Suspense fallback={<div className="h-20" />}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                itemsPerPage={ITEMS_PER_PAGE}
                basePath="/events"
              />
            </Suspense>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-8xl mb-6">🔍</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              לא נמצאו תוצאות
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              {query
                ? `לא מצאנו הצגות שמתאימות לחיפוש "${query}"`
                : 'לא נמצאו הצגות קרובות'}
            </p>
            {query && (
              <a
                href="/events"
                className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                חזרה לכל ההצגות
              </a>
            )}
          </div>
        )}

        {/* SEO Text */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 border-4 border-yellow-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              רשימת הצגות לילדים מלאה
            </h2>
            <p className="text-gray-700 leading-relaxed">
              באתר שלנו תמצאו את כל ההצגות והמופעים לילדים בישראל.
              הרשימה מתעדכנת יומיומית וכוללת מידע מקיף על כל הצגה - תאריכים, מחירים, מיקומים וסרטוני תצוגה מקדימה.
              השתמשו בפילטרים למציאת ההצגה המושלמת לפי עיר, תאריך או חיפוש חופשי.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
