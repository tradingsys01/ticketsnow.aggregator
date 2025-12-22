'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface FiltersProps {
  cities: string[]
}

export default function Filters({ cities }: FiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentCity = searchParams.get('city') || ''
  const currentDateFilter = searchParams.get('date') || ''

  const handleFilterChange = (filterType: 'city' | 'date', value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
      params.set(filterType, value)
    } else {
      params.delete(filterType)
    }

    // Reset to first page when changing filters
    params.delete('page')

    router.push(`/?${params.toString()}`)
  }

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('city')
    params.delete('date')
    params.delete('page')
    router.push(`/?${params.toString()}`)
  }

  const hasActiveFilters = currentCity || currentDateFilter

  return (
    <div className="mb-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-6 border-2 border-purple-200">
        <div className="flex flex-wrap gap-4 items-center">
          {/* City Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🏙️ עיר
            </label>
            <select
              value={currentCity}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none"
            >
              <option value="">כל הערים</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 תאריך
            </label>
            <select
              value={currentDateFilter}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none"
            >
              <option value="">כל התאריכים</option>
              <option value="today">היום</option>
              <option value="week">השבוע הקרוב</option>
              <option value="month">החודש הקרוב</option>
              <option value="3months">3 חודשים הקרובים</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="flex-shrink-0">
              <label className="block text-sm font-semibold text-transparent mb-2">
                &nbsp;
              </label>
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors whitespace-nowrap"
              >
                ✕ נקה סינון
              </button>
            </div>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-semibold text-gray-600">סינון פעיל:</span>
              {currentCity && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  עיר: {currentCity}
                </span>
              )}
              {currentDateFilter && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {currentDateFilter === 'today' && 'היום'}
                  {currentDateFilter === 'week' && 'השבוע הקרוב'}
                  {currentDateFilter === 'month' && 'החודש הקרוב'}
                  {currentDateFilter === '3months' && '3 חודשים הקרובים'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
