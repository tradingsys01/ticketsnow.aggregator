import Link from 'next/link'

export default function Header() {
  return (
    <header className="bg-gradient-to-l from-blue-500 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - RTL: on the right side */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="text-4xl">🎭</span>
            <div className="flex flex-col">
              <span className="text-2xl font-bold">הצגות לילדים</span>
              <span className="text-sm opacity-90">kids.ticketsnow.co.il</span>
            </div>
          </Link>

          {/* Navigation - RTL: on the left side */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-white hover:text-yellow-300 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-white/10"
            >
              ראשי
            </Link>
            <Link
              href="/#upcoming"
              className="text-white hover:text-yellow-300 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-white/10"
            >
              הצגות קרובות
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/10"
            aria-label="תפריט"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
