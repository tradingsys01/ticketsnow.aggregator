import { MetadataRoute } from 'next'
import prisma from '@/lib/db'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const ITEMS_PER_PAGE = 24

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get all upcoming events
  const events = await prisma.event.findMany({
    where: {
      isKidsEvent: true,
      date: {
        gte: new Date()
      }
    },
    orderBy: {
      updatedAt: 'desc'
    },
    select: {
      slug: true,
      updatedAt: true
    }
  })

  // Calculate total pages for /events pagination
  const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE)

  // Homepage
  const routes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0
    }
  ]

  // All events listing page (first page)
  routes.push({
    url: `${SITE_URL}/events`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9
  })

  // Paginated events pages (page 2+)
  for (let page = 2; page <= totalPages; page++) {
    routes.push({
      url: `${SITE_URL}/events?page=${page}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7
    })
  }

  // Individual event pages
  events.forEach(event => {
    routes.push({
      url: `${SITE_URL}/event/${event.slug}`,
      lastModified: event.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8
    })
  })

  return routes
}
