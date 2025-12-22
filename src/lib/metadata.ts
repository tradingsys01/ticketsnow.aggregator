import type { Metadata } from 'next'
import type { Event } from '@prisma/client'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const SITE_NAME = 'הצגות לילדים | kids.ticketsnow.co.il'

/**
 * Generate metadata for homepage
 */
export function generateHomeMetadata(): Metadata {
  return {
    title: 'הצגות לילדים | כל ההצגות והמופעים לילדים במקום אחד',
    description: 'מצאו את ההצגה המושלמת לילדים! מידע מקיף על כל ההצגות והמופעים לילדים, כולל מחירים, תאריכים, סרטוני תצוגה מקדימה והשוואת מחירים.',
    keywords: 'הצגות לילדים, מופעים לילדים, כרטיסים לילדים, בידור לילדים, תיאטרון לילדים',
    openGraph: {
      title: 'הצגות לילדים | kids.ticketsnow.co.il',
      description: 'כל ההצגות והמופעים לילדים במקום אחד',
      url: SITE_URL,
      siteName: SITE_NAME,
      locale: 'he_IL',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'הצגות לילדים | kids.ticketsnow.co.il',
      description: 'כל ההצגות והמופעים לילדים במקום אחד',
    },
    alternates: {
      canonical: SITE_URL,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

/**
 * Generate metadata for event page
 */
export function generateEventMetadata(event: Event): Metadata {
  const title = `${event.name} | הצגות לילדים`
  const description = event.description
    ? `${event.description.substring(0, 150)}...`
    : `הצגה לילדים: ${event.name} - ${event.venue}, ${event.city}. ${event.minPrice ? `מחיר מ-${event.minPrice}₪.` : ''} רכשו כרטיסים עכשיו!`

  const url = `${SITE_URL}/event/${event.slug}`

  return {
    title,
    description,
    keywords: `${event.name}, הצגות לילדים, ${event.city}, ${event.venue}, ${event.performerName || ''}`,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'he_IL',
      type: 'website',
      images: event.imageUrl ? [
        {
          url: event.imageUrl,
          width: 800,
          height: 600,
          alt: event.name,
        }
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: event.imageUrl ? [event.imageUrl] : [],
    },
    alternates: {
      canonical: url,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}
