'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  useEffect(() => {
    setQuery(searchParams.get('q') || '')
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())

    if (query.trim()) {
      params.set('q', query.trim())
      params.delete('page') // Reset to first page on new search
    } else {
      params.delete('q')
    }

    router.push(`/?${params.toString()}`)
  }

  const handleClear = () => {
    setQuery('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    params.delete('page')
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="mb-8">
      <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חפש הצגה לפי שם, מקום, עיר או מבצע..."
            className="w-full px-6 py-4 pr-12 text-lg rounded-full border-4 border-purple-300 focus:border-purple-500 focus:outline-none shadow-lg"
          />

          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-2">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 text-xl px-2"
                aria-label="נקה חיפוש"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-full font-semibold transition-colors"
            >
              🔍 חפש
            </button>
          </div>
        </div>

        {query && (
          <div className="mt-3 text-center text-gray-600">
            מחפש: <span className="font-semibold text-purple-600">{query}</span>
          </div>
        )}
      </form>
    </div>
  )
}
