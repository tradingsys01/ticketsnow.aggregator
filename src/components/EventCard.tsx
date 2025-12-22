import Link from 'next/link'
import Image from 'next/image'
import type { Event } from '@prisma/client'

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
  const eventDate = new Date(event.date)
  const formattedDate = new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(eventDate)

  const priceDisplay = event.minPrice
    ? event.maxPrice && event.maxPrice !== event.minPrice
      ? `${event.minPrice}-${event.maxPrice}₪`
      : `מ-${event.minPrice}₪`
    : 'מחיר לא ידוע'

  return (
    <Link href={`/event/${event.slug}`}>
      <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group cursor-pointer border-4 border-transparent hover:border-yellow-400">
        {/* Image Section */}
        <div className="relative h-48 bg-gradient-to-br from-blue-100 to-pink-100 overflow-hidden">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-8xl opacity-50">🎭</span>
            </div>
          )}

          {/* Price Badge */}
          <div className="absolute top-3 left-3 bg-yellow-400 text-gray-900 font-bold px-4 py-2 rounded-full shadow-lg">
            {priceDisplay}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5">
          {/* Event Name */}
          <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {event.name}
          </h3>

          {/* Date */}
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <span className="text-xl">📅</span>
            <span className="text-sm">{formattedDate}</span>
          </div>

          {/* Venue & City */}
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <span className="text-xl">📍</span>
            <span className="text-sm">
              {event.venue}, {event.city}
            </span>
          </div>

          {/* Performer (if available) */}
          {event.performerName && (
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <span className="text-xl">🎤</span>
              <span className="text-sm font-medium">{event.performerName}</span>
            </div>
          )}

          {/* Call to Action */}
          <div className="pt-3 border-t border-gray-200">
            <span className="text-blue-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              <span>לפרטים נוספים</span>
              <span className="text-lg">←</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
