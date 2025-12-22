'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

export default function Pagination({ currentPage, totalPages, totalItems, itemsPerPage }: PaginationProps) {
  const searchParams = useSearchParams()

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page > 1) {
      params.set('page', page.toString())
    } else {
      params.delete('page')
    }
    return `/?${params.toString()}`
  }

  if (totalPages <= 1) {
    return null
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generate page numbers to display
  const pageNumbers: (number | string)[] = []
  const maxPagesToShow = 7

  if (totalPages <= maxPagesToShow) {
    // Show all pages
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i)
    }
  } else {
    // Show first, last, and pages around current
    pageNumbers.push(1)

    if (currentPage > 3) {
      pageNumbers.push('...')
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pageNumbers.push(i)
    }

    if (currentPage < totalPages - 2) {
      pageNumbers.push('...')
    }

    pageNumbers.push(totalPages)
  }

  return (
    <div className="mt-12 space-y-4">
      {/* Results info */}
      <div className="text-center text-gray-600">
        מציג {startItem}-{endItem} מתוך {totalItems} הצגות
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {/* Previous button */}
        {currentPage > 1 ? (
          <Link
            href={createPageUrl(currentPage - 1)}
            className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-50 hover:border-purple-500 transition-colors font-semibold"
          >
            → הקודם
          </Link>
        ) : (
          <span className="px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-lg text-gray-400 font-semibold cursor-not-allowed">
            → הקודם
          </span>
        )}

        {/* Page numbers */}
        <div className="flex gap-2">
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                  ...
                </span>
              )
            }

            const pageNum = page as number
            const isActive = pageNum === currentPage

            return (
              <Link
                key={pageNum}
                href={createPageUrl(pageNum)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isActive
                    ? 'bg-purple-500 text-white border-2 border-purple-500'
                    : 'bg-white border-2 border-purple-300 hover:bg-purple-50 hover:border-purple-500'
                }`}
              >
                {pageNum}
              </Link>
            )
          })}
        </div>

        {/* Next button */}
        {currentPage < totalPages ? (
          <Link
            href={createPageUrl(currentPage + 1)}
            className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-50 hover:border-purple-500 transition-colors font-semibold"
          >
            הבא ←
          </Link>
        ) : (
          <span className="px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-lg text-gray-400 font-semibold cursor-not-allowed">
            הבא ←
          </span>
        )}
      </div>
    </div>
  )
}
