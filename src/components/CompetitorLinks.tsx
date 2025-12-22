import prisma from '@/lib/db'

interface CompetitorLinksProps {
  eventId: string
  eventName: string
}

export default async function CompetitorLinks({ eventId, eventName }: CompetitorLinksProps) {
  // Fetch competitor matches directly from database
  let competitors: Array<{
    name: string
    url: string
    matchScore: number
  }> = []

  try {
    const matches = await prisma.competitorMatch.findMany({
      where: {
        eventId,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        matchScore: 'desc'
      }
    })

    competitors = matches.map(match => ({
      name: match.competitorName,
      url: match.competitorUrl,
      matchScore: match.matchScore
    }))
  } catch (error) {
    console.error('Failed to fetch competitors:', error)
  }

  if (competitors.length === 0) {
    return null
  }

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6 border-4 border-blue-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
        <span className="text-3xl">🔍</span>
        השוואת מחירים
      </h2>

      <p className="text-gray-600 mb-4 text-sm">
        מצאנו {competitors.length} תוצאות באתרים נוספים
      </p>

      <div className="space-y-3">
        {competitors.map((competitor: any, index) => {
          // Extract domain name for display
          const urlObj = new URL(competitor.url)
          const domain = urlObj.hostname.replace('www.', '')

          return (
            <a
              key={index}
              href={competitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-gradient-to-l from-blue-50 to-purple-50 rounded-xl hover:shadow-md transition-all border-2 border-transparent hover:border-blue-400"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {competitor.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    מציגים "{eventName}"
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span>🌐</span>
                    <span className="text-blue-600">{domain}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">התאמה: {Math.round(competitor.matchScore * 100)}%</span>
                  </div>
                </div>

                <div className="text-blue-600 text-2xl">
                  ←
                </div>
              </div>
            </a>
          )
        })}
      </div>

      <p className="text-xs text-gray-500 mt-4 text-center">
        הקישורים הם לאתרים חיצוניים. אנו ממליצים להשוות מחירים לפני רכישה.
      </p>
    </section>
  )
}
