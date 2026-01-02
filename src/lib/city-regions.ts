/**
 * City to Region Mapping for Israel
 *
 * Maps cities to their metropolitan areas/regions for improved search.
 * When a user searches for "תל אביב-יפו", they likely also want events
 * in nearby cities like גבעתיים, רמת גן, חולון, etc.
 */

export interface CityRegion {
  name: string
  hebrewName: string
  cities: string[]
}

// Define metropolitan regions
export const CITY_REGIONS: CityRegion[] = [
  {
    name: 'gush-dan',
    hebrewName: 'גוש דן',
    cities: [
      'תל אביב-יפו',
      'תל אביב',
      'רמת גן',
      'גבעתיים',
      'חולון',
      'בת ים',
      'בני ברק',
      'גני תקווה',
      'פתח תקווה',
      'יהוד',
      'אור יהודה',
      'קריית אונו',
      'ראשון לציון',
      'רמת השרון',
      'הרצליה',
      'כפר שמריהו',
      'מועצה האיזורית דרום השרון - צומת הירקון',
    ]
  },
  {
    name: 'sharon',
    hebrewName: 'השרון',
    cities: [
      'כפר סבא',
      'רעננה',
      'הוד השרון',
      'נתניה',
      'רמת השרון',
      'הרצליה',
      'שוהם',
      'פרדס חנה',
      'אור עקיבא',
    ]
  },
  {
    name: 'haifa',
    hebrewName: 'חיפה והקריות',
    cities: [
      'חיפה',
      'נשר',
      'קרית מוצקין',
      'קרית אתא',
      'קרית ביאליק',
      'קרית ים',
      'טירת הכרמל',
      'מועצה האזורית חוף הכרמל',
      'קיבוץ יגור',
    ]
  },
  {
    name: 'jerusalem',
    hebrewName: 'ירושלים והסביבה',
    cities: [
      'ירושלים',
      'מודיעין',
      'בית שמש',
      'מבשרת ציון',
    ]
  },
  {
    name: 'south',
    hebrewName: 'הדרום',
    cities: [
      'באר שבע',
      'אשדוד',
      'אשקלון',
      'יבנה',
      'נס ציונה',
      'רחובות',
      'קיבוץ גבעת ברנר',
    ]
  },
  {
    name: 'north',
    hebrewName: 'הצפון',
    cities: [
      'כרמיאל',
      'טבריה',
      'נצרת',
      'עפולה',
      'קיבוץ כברי',
      'מועצה אזורית עמק המעיינות',
      'קיבוץ גן שמואל',
    ]
  }
]

// Build reverse mapping: city -> region
const cityToRegionMap = new Map<string, CityRegion>()
for (const region of CITY_REGIONS) {
  for (const city of region.cities) {
    cityToRegionMap.set(city, region)
  }
}

/**
 * Get the region for a given city
 */
export function getCityRegion(city: string): CityRegion | undefined {
  return cityToRegionMap.get(city)
}

/**
 * Get all cities in the same region as the given city
 */
export function getRelatedCities(city: string): string[] {
  const region = cityToRegionMap.get(city)
  if (region) {
    return region.cities
  }
  return [city]
}

/**
 * Get the region name for a city
 */
export function getRegionName(city: string): string | undefined {
  const region = cityToRegionMap.get(city)
  return region?.hebrewName
}

/**
 * Check if two cities are in the same region
 */
export function areInSameRegion(city1: string, city2: string): boolean {
  const region1 = cityToRegionMap.get(city1)
  const region2 = cityToRegionMap.get(city2)
  return region1 !== undefined && region1 === region2
}

/**
 * Get all unique regions with their city counts from a list of cities
 */
export function groupCitiesByRegion(cities: string[]): Map<string, string[]> {
  const regionGroups = new Map<string, string[]>()

  for (const city of cities) {
    const region = cityToRegionMap.get(city)
    const regionName = region?.hebrewName || 'אחר'

    if (!regionGroups.has(regionName)) {
      regionGroups.set(regionName, [])
    }
    regionGroups.get(regionName)!.push(city)
  }

  return regionGroups
}
