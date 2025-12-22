import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EventList from '@/components/EventList'
import { getUpcomingEvents } from '@/services/events.service'

export default async function Home() {
  // Fetch upcoming events (limit to 12 for homepage)
  const events = await getUpcomingEvents(12, 0)

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

        {/* Event List */}
        <EventList events={events} title="הצגות קרובות" />

        {/* Additional Info */}
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
      </main>

      <Footer />
    </div>
  )
}
