import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-pink-50 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl mx-auto">
          {/* 404 Emoji */}
          <div className="text-9xl mb-6">🎭</div>

          {/* Error Message */}
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            404
          </h1>

          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            הדף לא נמצא
          </h2>

          <p className="text-xl text-gray-600 mb-8">
            מצטערים, הדף שחיפשת לא קיים או שהוסר.
            <br />
            אולי ההצגה כבר הסתיימה?
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <span>→</span>
              <span>חזרה לעמוד הראשי</span>
            </Link>

            <Link
              href="/#upcoming"
              className="inline-flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <span>🎪</span>
              <span>הצגות קרובות</span>
            </Link>
          </div>

          {/* Suggestions */}
          <div className="mt-12 p-6 bg-white rounded-2xl shadow-lg border-4 border-yellow-300">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              💡 הצעות
            </h3>
            <ul className="text-right text-gray-700 space-y-2">
              <li>• בדקו שכתובת האתר נכונה</li>
              <li>• חפשו הצגות אחרות בעמוד הראשי</li>
              <li>• אולי ההצגה כבר לא מופיעה</li>
              <li>• נסו לחפש בשם אחר</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
