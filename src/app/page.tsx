import { Suspense } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EventList from '@/components/EventList'
import SearchBar from '@/components/SearchBar'
import Filters from '@/components/Filters'
import Pagination from '@/components/Pagination'
import { searchEvents, getSearchResultsCount, getUniqueCities } from '@/services/events.service'

const ITEMS_PER_PAGE = 12

interface HomeProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function Home({ searchParams }: HomeProps) {
  // Get search query, filters, and page from URL params
  const query = typeof searchParams.q === 'string' ? searchParams.q : ''
  const city = typeof searchParams.city === 'string' ? searchParams.city : ''
  const dateFilter = typeof searchParams.date === 'string' ? searchParams.date : ''
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1
  const currentPage = Math.max(1, page)

  // Calculate offset
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  // Fetch events, total count, and cities
  const [events, totalCount, cities] = await Promise.all([
    searchEvents(query, ITEMS_PER_PAGE, offset, city, dateFilter),
    getSearchResultsCount(query, city, dateFilter),
    getUniqueCities()
  ])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Determine title based on search
  const title = query
    ? `תוצאות חיפוש: "${query}"`
    : 'הצגות קרובות'

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-pink-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            🎭 הצגות לילדים 🎪
          </h1>
          <p className="text-2xl text-gray-700 mb-2">
            כל ההצגות והמופעים לילדים במקום אחד
          </p>
          <p className="text-lg text-gray-600">
            מידע מקיף, סרטוני תצוגה מקדימה והשוואת מחירים
          </p>
        </div>

        {/* Search Bar */}
        <Suspense fallback={<div className="h-16" />}>
          <SearchBar />
        </Suspense>

        {/* Filters */}
        <Suspense fallback={<div className="h-24" />}>
          <Filters cities={cities} />
        </Suspense>

        {/* Event List */}
        {events.length > 0 ? (
          <>
            <EventList events={events} title={title} />

            {/* Pagination */}
            <Suspense fallback={<div className="h-16" />}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                itemsPerPage={ITEMS_PER_PAGE}
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
                href="/"
                className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                חזרה לכל ההצגות
              </a>
            )}
          </div>
        )}

        {/* Additional Info - only show on first page without search */}
        {!query && currentPage === 1 && events.length > 0 && (
          <div className="mt-12 text-center">
            <div className="bg-white rounded-2xl shadow-lg p-8 border-4 border-yellow-300">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                ✨ ברוכים הבאים! ✨
              </h2>
              <p className="text-gray-700 leading-relaxed">
                באתר שלנו תוכלו למצוא את כל ההצגות והמופעים לילדים במקום אחד.
                <br />
                אנחנו מציגים מידע מקיף, סרטוני תצוגה מקדימה מיוטיוב, והשוואת מחירים מאתרים שונים.
                <br />
                בהצלחה במציאת ההצגה המושלמת לילדים שלכם! 🎉
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
