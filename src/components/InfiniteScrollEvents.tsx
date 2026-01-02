'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import EventCard from './EventCard'
import type { Event } from '@prisma/client'

interface InfiniteScrollEventsProps {
  initialEvents: Event[]
  initialTotal: number
  itemsPerPage: number
}

export default function InfiniteScrollEvents({
  initialEvents,
  initialTotal,
  itemsPerPage
}: InfiniteScrollEventsProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialEvents.length < initialTotal)
  const [offset, setOffset] = useState(initialEvents.length)
  const loaderRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

  // Get current filter params
  const query = searchParams.get('q') || ''
  const city = searchParams.get('city') || ''
  const dateFilter = searchParams.get('date') || ''
  const sort = searchParams.get('sort') || 'date'

  // Reset when filters change
  useEffect(() => {
    setEvents(initialEvents)
    setOffset(initialEvents.length)
    setHasMore(initialEvents.length < initialTotal)
  }, [initialEvents, initialTotal, query, city, dateFilter, sort])

  // Fetch more events
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
        ...(query && { q: query }),
        ...(city && { city }),
        ...(dateFilter && { date: dateFilter }),
        ...(sort && sort !== 'date' && { sort })
      })

      const response = await fetch(`/api/events?${params}`)
      const data = await response.json()

      if (data.events && data.events.length > 0) {
        setEvents(prev => [...prev, ...data.events])
        setOffset(prev => prev + data.events.length)
        setHasMore(data.hasMore)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more events:', error)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, offset, itemsPerPage, query, city, dateFilter, sort])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-6xl mb-4 block">🎭</span>
        <p className="text-xl text-gray-600">לא נמצאו הצגות</p>
      </div>
    )
  }

  const title = query ? `תוצאות חיפוש: ${query}` : 'הצגות קרובות'

  return (
    <section className="py-8">
      {/* Section Title */}
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
          <span className="text-5xl">🎪</span>
          {title}
          <span className="text-5xl">🎪</span>
        </h2>
        <p className="text-gray-600">
          {initialTotal} הצגות ממתינות לכם!
        </p>
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Loading indicator / Scroll trigger */}
      <div ref={loaderRef} className="py-8 text-center">
        {loading && (
          <div className="flex flex-col items-center gap-4">
            <div className="text-6xl animate-bounce">🎭</div>
            <p className="text-xl text-gray-600">טוען עוד הצגות...</p>
          </div>
        )}
        {!loading && hasMore && (
          <p className="text-gray-500 text-sm">גלול למטה לעוד הצגות</p>
        )}
        {!loading && !hasMore && events.length > itemsPerPage && (
          <div className="text-center py-4">
            <p className="text-gray-500">הגעת לסוף הרשימה! 🎉</p>
            <p className="text-sm text-gray-400">סה&quot;כ {events.length} הצגות</p>
          </div>
        )}
      </div>
    </section>
  )
}
