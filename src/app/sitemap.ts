import { MetadataRoute } from 'next'
import prisma from '@/lib/db'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

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

  // Homepage
  const routes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0
    }
  ]

  // Event pages
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
