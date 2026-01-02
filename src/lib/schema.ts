import type { Event } from '@prisma/client'
import { getRegionName } from '@/lib/city-regions'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const SITE_NAME = 'הצגות לילדים | kids.ticketsnow.co.il'

/**
 * Generate Event schema (schema.org/Event)
 */
export function generateEventSchema(event: Event) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${SITE_URL}/event/${event.slug}`,
    name: event.name,
    description: event.description || `הצגה לילדים: ${event.name}`,
    startDate: event.date.toISOString(),
    endDate: event.date.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    // SEO/LLM: When this listing was created and last updated
    dateCreated: event.createdAt.toISOString(),
    dateModified: event.updatedAt.toISOString(),
    location: {
      '@type': 'Place',
      name: event.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.city,
        // SEO/LLM: Include region for better geographic understanding
        addressRegion: getRegionName(event.city) || 'ישראל',
        addressCountry: 'IL'
      }
    },
    image: event.imageUrl ? [event.imageUrl] : [],
    offers: event.minPrice ? {
      '@type': 'Offer',
      url: event.ticketUrl,
      price: event.minPrice,
      priceCurrency: 'ILS',
      availability: 'https://schema.org/InStock',
      validFrom: new Date().toISOString(),
      ...(event.maxPrice && event.maxPrice !== event.minPrice && {
        priceValidUntil: event.date.toISOString()
      })
    } : {
      '@type': 'Offer',
      url: event.ticketUrl,
      availability: 'https://schema.org/InStock'
    },
    performer: event.performerName ? {
      '@type': 'PerformingGroup',
      name: event.performerName
    } : undefined,
    organizer: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL
    }
  }

  // Remove undefined fields
  return JSON.parse(JSON.stringify(schema))
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  }
}

/**
 * Generate FAQ schema for event page
 */
export function generateFAQSchema(event: Event) {
  const region = getRegionName(event.city)
  const locationText = region
    ? `ב${event.venue}, ${event.city} (אזור ${region})`
    : `ב${event.venue}, ${event.city}`

  const faqs = [
    {
      question: `מתי מתקיימת ההצגה ${event.name}?`,
      answer: `ההצגה מתקיימת בתאריך ${event.date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })} ${locationText}.`
    },
    {
      question: `איפה אפשר לקנות כרטיסים ל${event.name}?`,
      answer: `ניתן לרכוש כרטיסים דרך האתר שלנו או ישירות דרך הקישור: ${event.ticketUrl}`
    }
  ]

  if (event.minPrice) {
    faqs.push({
      question: `כמה עולים כרטיסים ל${event.name}?`,
      answer: event.maxPrice && event.maxPrice !== event.minPrice
        ? `מחיר הכרטיסים נע בין ${event.minPrice}₪ ל-${event.maxPrice}₪.`
        : `מחיר הכרטיס ${event.minPrice}₪.`
    })
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }
}

/**
 * Generate Organization schema
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'כל ההצגות והמופעים לילדים במקום אחד - מידע מקיף, כרטיסים וסרטוני תצוגה מקדימה',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IL'
    },
    sameAs: [
      'https://www.facebook.com/profile.php?id=100066977252854',
      'https://www.youtube.com/@ticketsnowcoil'
    ]
  }
}

/**
 * Generate WebSite schema with search action
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  }
}

/**
 * Generate ItemList schema for events listing
 */
export function generateItemListSchema(events: Event[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: events.map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/event/${event.slug}`
    }))
  }
}
