import type { Event } from '@prisma/client'
import EventCard from './EventCard'

interface EventListProps {
  events: Event[]
  title?: string
  emptyMessage?: string
}

export default function EventList({
  events,
  title = 'הצגות קרובות',
  emptyMessage = 'לא נמצאו הצגות'
}: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-6xl mb-4 block">🎭</span>
        <p className="text-xl text-gray-600">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <section className="py-8">
      {/* Section Title */}
      {title && (
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <span className="text-5xl">🎪</span>
            {title}
            <span className="text-5xl">🎪</span>
          </h2>
          <p className="text-gray-600">
            {events.length} הצגות ממתינות לכם!
          </p>
        </div>
      )}

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}
