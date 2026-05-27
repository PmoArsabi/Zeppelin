import { useCallback, useEffect, useState, type ReactNode } from 'react'

interface CollapsibleFilterPanelProps {
  children: ReactNode
  active: boolean
  onClear?: () => void
  total: number
  filtered: number
  /** Persiste expandido/colapsado entre visitas */
  storageKey?: string
  defaultExpanded?: boolean
  /** Incrementar este valor desde afuera fuerza la expansión (p.ej. al inyectar filtros desde la matriz KPI) */
  forceExpandTrigger?: number
}

function readStoredExpanded(key: string | undefined, fallback: boolean): boolean {
  if (!key || typeof window === 'undefined') return fallback
  const stored = localStorage.getItem(key)
  if (stored === 'true') return true
  if (stored === 'false') return false
  return fallback
}

export default function CollapsibleFilterPanel({
  children,
  active,
  onClear,
  total,
  filtered,
  storageKey,
  defaultExpanded = true,
  forceExpandTrigger,
}: CollapsibleFilterPanelProps) {
  const [expanded, setExpanded] = useState(() =>
    readStoredExpanded(storageKey, defaultExpanded)
  )

  // Abre el panel cuando se inyectan filtros externos (p.ej. desde la matriz KPI)
  useEffect(() => {
    if (forceExpandTrigger) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpanded(true)
    }
  }, [forceExpandTrigger])

  const toggle = useCallback(() => {
    setExpanded(prev => {
      const next = !prev
      if (storageKey) localStorage.setItem(storageKey, String(next))
      return next
    })
  }, [storageKey])

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm mb-4">
      <div className="px-3 sm:px-4 py-3 flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="flex items-center gap-2 text-left min-w-0 rounded-lg -ml-1 px-1 py-0.5
                     hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          <svg
            className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Filtros</span>
          {active && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
              Activos
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggle}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
          >
            {expanded ? 'Ocultar' : 'Mostrar'}
          </button>
          {active && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl
                         text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700
                         hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="px-3 sm:px-4 pb-3 pt-3 border-t border-slate-100 dark:border-gray-800 space-y-3">
            {children}
            {active && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Mostrando <span className="font-semibold text-slate-600 dark:text-slate-300">{filtered}</span> de{' '}
                <span className="font-semibold">{total}</span> registros
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
