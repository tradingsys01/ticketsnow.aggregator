// Raw event from Bravo JSON API
export interface BravoEvent {
  id: string
  name: string
  description?: string
  category: string
  date: string
  time?: string
  venue: string
  city: string
  minPrice?: number
  maxPrice?: number
  imageUrl?: string
  ticketUrl: string
  performerName?: string
  [key: string]: any
}

// Normalized event for our database
export interface Event {
  id: string
  externalId: string
  name: string
  slug: string
  description?: string
  category: string
  date: Date
  time?: string
  venue: string
  city: string
  minPrice?: number
  maxPrice?: number
  imageUrl?: string
  ticketUrl: string
  performerName?: string
  isKidsEvent: boolean
  createdAt: Date
  updatedAt: Date
  lastSynced: Date
}

// Competitor search result
export interface CompetitorResult {
  competitorName: string
  competitorUrl: string
  matchScore: number
}

// YouTube search result
export interface YouTubeResult {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
}

// API response types
export interface EventsResponse {
  events: Event[]
  total: number
  hasMore: boolean
}

export interface CompetitorsResponse {
  competitors: CompetitorResult[]
  fromCache: boolean
  checkedAt: string
}

export interface YouTubeResponse {
  videos: YouTubeResult[]
  fromCache: boolean
}

export interface SyncResponse {
  success: boolean
  eventsTotal: number
  eventsNew: number
  eventsUpdated: number
  eventsRemoved: number
  errorMessage?: string
}
