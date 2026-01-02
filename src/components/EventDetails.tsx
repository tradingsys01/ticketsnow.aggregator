import Image from 'next/image'
import type { Event } from '@prisma/client'
import CompetitorLinks from './CompetitorLinks'
import YouTubeVideos from './YouTubeVideos'
import { Suspense } from 'react'

interface EventDetailsProps {
  event: Event
}

export default function EventDetails({ event }: EventDetailsProps) {
  const priceDisplay = event.minPrice
    ? event.maxPrice && event.maxPrice !== event.minPrice
      ? `${event.minPrice}-${event.maxPrice}₪`
      : `מ-${event.minPrice}₪`
    : 'מחיר לא ידוע'

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl overflow-hidden shadow-2xl">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative h-64 md:h-auto min-h-[300px] bg-gradient-to-br from-blue-100 to-pink-100">
            {event.imageUrl ? (
              <Image
                src={event.imageUrl}
                alt={event.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-9xl opacity-30">🎭</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-8 text-white">
            <h1 className="text-4xl font-bold mb-6">{event.name}</h1>

            <div className="space-y-4">
              {/* Category */}
              <div className="flex items-start gap-3">
                <span className="text-3xl">🎭</span>
                <div>
                  <div className="font-semibold">הצגה לילדים ולכל המשפחה</div>
                  <div className="text-blue-100">הופעות ברחבי הארץ</div>
                </div>
              </div>

              {/* Performer */}
              {event.performerName && (
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🎤</span>
                  <div>
                    <div className="font-semibold">{event.performerName}</div>
                    <div className="text-blue-100">מבצע</div>
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="flex items-start gap-3">
                <span className="text-3xl">💰</span>
                <div>
                  <div className="font-semibold text-yellow-300 text-2xl">
                    {priceDisplay}
                  </div>
                  <div className="text-blue-100 text-sm">החל מ-</div>
                </div>
              </div>

              {/* Buy Ticket Button */}
              <div className="pt-4">
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all text-lg"
                >
                  🎫 לתאריכים ורכישת כרטיסים
                </a>
                <p className="text-blue-100 text-sm mt-2">בחר תאריך ומיקום באתר המכירה</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border-4 border-yellow-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <span className="text-3xl">📖</span>
            אודות ההצגה
          </h2>
          <div
            className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        </div>
      )}

      {/* YouTube Videos Section */}
      <Suspense
        fallback={
          <div className="bg-white rounded-2xl shadow-lg p-6 border-4 border-pink-200">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        }
      >
        <YouTubeVideos eventId={event.id} eventName={event.name} />
      </Suspense>

      {/* Competitor Links Section */}
      <Suspense
        fallback={
          <div className="bg-white rounded-2xl shadow-lg p-6 border-4 border-blue-200">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        }
      >
        <CompetitorLinks eventId={event.id} eventName={event.name} />
      </Suspense>

      {/* Additional Info */}
      <div className="bg-gradient-to-l from-purple-100 to-blue-100 rounded-2xl p-6">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-2xl">ℹ️</span>
          מידע חשוב
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• מומלץ להגיע 15-20 דקות לפני תחילת ההצגה</li>
          <li>• יש לוודא את המקומות והתאריכים בעת רכישת הכרטיסים</li>
          <li>• המידע באתר מסופק כשירות ועשוי להשתנות</li>
          <li>• לפרטים מדויקים יש לפנות ישירות לאתר המוכר</li>
        </ul>
      </div>

      {/* Event Metadata - for SEO and transparency */}
      <div className="text-xs text-gray-500 border-t border-gray-200 pt-4 mt-4">
        <div className="flex flex-wrap gap-4 justify-end" dir="ltr">
          <span>
            <time dateTime={event.createdAt.toISOString()}>
              Added: {event.createdAt.toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' })}
            </time>
          </span>
          <span>
            <time dateTime={event.updatedAt.toISOString()}>
              Updated: {event.updatedAt.toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </time>
          </span>
        </div>
      </div>
    </div>
  )
}
