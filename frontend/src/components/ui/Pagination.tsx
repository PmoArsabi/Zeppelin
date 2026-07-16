interface PaginationProps {
  page: number
  pageCount: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

function buildPageList(page: number, pageCount: number): (number | '…')[] {
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1])
  const sorted = [...pages].filter(p => p >= 1 && p <= pageCount).sort((a, b) => a - b)
  const result: (number | '…')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…')
    result.push(sorted[i])
  }
  return result
}

export default function Pagination({ page, pageCount, pageSize, total, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pageList = buildPageList(page, pageCount)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-4 py-3 border-t border-slate-100 dark:border-gray-800">
      <span className="text-xs text-slate-400 dark:text-slate-500 order-2 sm:order-1">
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400
                     hover:bg-slate-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {pageList.map((p, idx) =>
          p === '…' ? (
            <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors
                ${p === page
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Página siguiente"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400
                     hover:bg-slate-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
