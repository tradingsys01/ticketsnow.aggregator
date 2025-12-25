import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gradient-to-l from-purple-600 to-blue-500 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="text-2xl">🎭</span>
              אודות
            </h3>
            <p className="text-white/90 text-sm leading-relaxed">
              כל ההצגות והמופעים לילדים במקום אחד - מידע מקיף, כרטיסים וסרטוני תצוגה מקדימה
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="text-2xl">🔗</span>
              קישורים
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-yellow-300 transition-colors">
                  ראשי
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-yellow-300 transition-colors">
                  כל ההצגות
                </Link>
              </li>
              <li>
                <a
                  href="https://ticketsnow.co.il"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-yellow-300 transition-colors"
                >
                  ticketsnow.co.il
                </a>
              </li>
            </ul>
          </div>

          {/* Contact/Info */}
          <div>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="text-2xl">📧</span>
              יצירת קשר
            </h3>
            <p className="text-white/90 text-sm mb-3">
              kids.ticketsnow.co.il
            </p>

            {/* Social Media */}
            <div className="mb-3">
              <a
                href="https://www.facebook.com/profile.php?id=100066977252854"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-4 py-2 transition-all text-sm"
              >
                <span className="text-xl">👍</span>
                עקבו אחרינו בפייסבוק
              </a>
            </div>

            <p className="text-white/70 text-xs">
              המידע באתר מסופק כשירות ללקוחות
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/20 mt-8 pt-6 text-center text-sm text-white/80">
          <p>
            © {currentYear} kids.ticketsnow.co.il - כל הזכויות שמורות
          </p>
        </div>
      </div>
    </footer>
  )
}
