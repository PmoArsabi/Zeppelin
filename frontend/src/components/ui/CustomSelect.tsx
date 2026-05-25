import { useState, useRef, useEffect, useMemo } from 'react'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string | null | undefined
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  error?: boolean
  id?: string
  disabled?: boolean
  searchable?: boolean
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  error = false,
  id,
  disabled = false,
  searchable = false,
}: CustomSelectProps) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const ref                   = useRef<HTMLDivElement>(null)
  const searchRef             = useRef<HTMLInputElement>(null)
  const safeValue = value ?? ''
  const selected = options.find(o => o.value === safeValue)
  const displayLabel = selected?.label ?? (safeValue.trim() ? safeValue.trim() : null)

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = query.toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, query, searchable])

  const close = () => { setOpen(false); setQuery('') }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSelect = (val: string) => {
    onChange(val)
    close()
  }

  const borderClass = error
    ? 'border-rose-400 dark:border-rose-500 ring-rose-400/30'
    : 'border-slate-200 dark:border-slate-700'

  const focusClass = error
    ? 'ring-2 ring-rose-400/30 border-rose-400'
    : open
      ? 'ring-2 ring-indigo-500/25 border-indigo-400 dark:border-indigo-500'
      : ''

  return (
    <div ref={ref} className="relative" id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`
          w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl border
          transition-all duration-150 cursor-pointer text-left
          bg-white dark:bg-slate-800/60
          disabled:opacity-50 disabled:cursor-not-allowed
          ${borderClass} ${focusClass}
          ${displayLabel ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}
        `}
      >
        <span className="truncate">{displayLabel ?? placeholder}</span>
        <svg
          className={`w-4 h-4 shrink-0 ml-2 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="
          absolute z-50 mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700
          bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/60 dark:shadow-black/30
          overflow-hidden animate-in
        ">
          {searchable && (
            <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                             bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-white
                             placeholder-slate-400 dark:placeholder-slate-500
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400
                             transition-all"
                />
              </div>
            </div>
          )}

          <ul className="py-1 max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500 text-center">
                Sin resultados
              </li>
            ) : (
              filtered.map(opt => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      w-full text-left px-4 py-2.5 text-sm transition-colors duration-100
                      ${opt.value === safeValue
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                </li>
              ))
            )}
          </ul>

          {searchable && filtered.length > 0 && (
            <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
