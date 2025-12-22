import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-pink-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="text-center py-20">
          {/* Animated Loading Spinner */}
          <div className="inline-block">
            <div className="text-8xl mb-6 animate-bounce">
              🎭
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            טוען...
          </h2>

          <p className="text-xl text-gray-600 mb-8">
            מכינים את כל המידע על ההצגות הכי מגניבות!
          </p>

          {/* Loading Skeleton for Event Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-gray-200 animate-pulse"
              >
                {/* Image Skeleton */}
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300"></div>

                {/* Content Skeleton */}
                <div className="p-5 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
