import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface FilterMultiSelectProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  options: string[]
  className?: string
}

function summaryLabel(selected: string[]): string {
  if (selected.length === 0) return 'Todos'
  if (selected.length === 1) return selected[0]
  return `${selected.length} seleccionados`
}

interface DropdownPos { top: number; left: number; width: number }

export default function FilterMultiSelect({
  label,
  value,
  onChange,
  options,
  className = '',
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<DropdownPos | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(o => o.toLowerCase().includes(q))
  }, [options, query])

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const openDropdown = () => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width })
    setOpen(true)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (btnRef.current?.contains(target) || dropRef.current?.contains(target)) return
      close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Reposition on scroll/resize; close only if the scroll happened outside the dropdown itself
  useEffect(() => {
    if (!open) return
    const reposition = () => {
      if (!btnRef.current) return
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width })
    }
    const handler = (e: Event) => {
      if (dropRef.current?.contains(e.target as Node)) return
      reposition()
    }
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt))
    else onChange([...value, opt])
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every(o => value.includes(o))

  const toggleFilteredVisible = () => {
    if (allFilteredSelected) {
      const remove = new Set(filtered)
      onChange(value.filter(v => !remove.has(v)))
    } else {
      onChange([...new Set([...value, ...filtered])])
    }
  }

  const dropdown = open && pos ? createPortal(
    <div
      ref={dropRef}
      style={{ position: 'absolute', top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 180), maxWidth: 320 }}
      className="z-9999 rounded-xl border border-slate-200 dark:border-slate-700
                 bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/60 dark:shadow-black/30 overflow-hidden"
    >
      <div className="px-2 pt-2 pb-1.5 border-b border-slate-100 dark:border-slate-700 space-y-1.5">
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
            />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600
                       bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-white
                       placeholder-slate-400 dark:placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px]">
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Limpiar
          </button>
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={toggleFilteredVisible}
              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {allFilteredSelected ? 'Quitar visibles' : 'Seleccionar visibles'}
            </button>
          )}
        </div>
      </div>

      <ul className="py-1 max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-xs text-slate-400 text-center">Sin resultados</li>
        ) : (
          filtered.map(opt => {
            const checked = value.includes(opt)
            return (
              <li key={opt}>
                <label
                  className={`flex items-start gap-2 px-3 py-2 cursor-pointer text-xs transition-colors
                    ${checked
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                  />
                  <span className="leading-snug wrap-break-word">{opt}</span>
                </label>
              </li>
            )
          })
        )}
      </ul>
    </div>,
    document.body,
  ) : null

  return (
    <div className={`relative flex flex-col gap-0.5 min-w-0 ${className}`}>
      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-tight">{label}</span>
      <button
        ref={btnRef}
        type="button"
        onClick={() => open ? close() : openDropdown()}
        className={`
          w-full flex items-center justify-between gap-1 px-2.5 py-1.5 pr-2 text-xs rounded-lg border min-h-8
          transition-all duration-150 cursor-pointer text-left
          bg-slate-50 dark:bg-slate-800/60
          ${open
            ? 'ring-2 ring-indigo-500/25 border-indigo-400 dark:border-indigo-500'
            : 'border-slate-200 dark:border-slate-700'
          }
          ${value.length ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}
        `}
      >
        <span className="truncate">{summaryLabel(value)}</span>
        <svg
          className={`w-3 h-3 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {dropdown}
    </div>
  )
}
