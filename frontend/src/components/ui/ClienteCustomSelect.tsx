import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { searchClientesZeppelin, fetchClienteById } from '@/lib/clientes'
import type { ClienteZeppelin } from '@/lib/clientes'

interface Props {
  value: number | null
  onChange: (id: number | null, fullname: string) => void
  disabled?: boolean
  error?: boolean
  placeholder?: string
}

interface DropdownPos { top: number; left: number; width: number }

const DEBOUNCE_MS = 300

export default function ClienteCustomSelect({ value, onChange, disabled, error, placeholder = 'Seleccionar cliente...' }: Props) {
  const [open, setOpen]           = useState(false)
  const [query, setQuery]         = useState('')
  const [options, setOptions]     = useState<ClienteZeppelin[]>([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState<ClienteZeppelin | null>(null)
  const [pos, setPos]             = useState<DropdownPos | null>(null)

  const btnRef    = useRef<HTMLButtonElement>(null)
  const dropRef   = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resolver el cliente seleccionado por ID al montar o cuando cambia value
  useEffect(() => {
    if (value == null) { setSelected(null); return }
    if (selected?.id === value) return
    fetchClienteById(value).then(c => setSelected(c))
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadOptions = useCallback(async (q: string) => {
    setLoading(true)
    const { data } = await searchClientesZeppelin(q)
    setOptions(data)
    setLoading(false)
  }, [])

  const openDropdown = () => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width })
    setOpen(true)
    setQuery('')
    loadOptions('')
  }

  const close = () => { setOpen(false); setQuery('') }

  const handleQueryChange = (q: string) => {
    setQuery(q)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => loadOptions(q), DEBOUNCE_MS)
  }

  const select = (c: ClienteZeppelin) => {
    setSelected(c)
    onChange(c.id, c.fullname)
    close()
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected(null)
    onChange(null, '')
  }

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || dropRef.current?.contains(t)) return
      close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Cerrar al scroll/resize (ignora el scroll dentro del propio dropdown)
  useEffect(() => {
    if (!open) return
    const handler = (e: Event) => {
      if (dropRef.current?.contains(e.target as Node)) return
      close()
    }
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => { window.removeEventListener('scroll', handler, true); window.removeEventListener('resize', handler) }
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const dropdown = open && pos ? createPortal(
    <div
      ref={dropRef}
      style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, maxWidth: 520 }}
      className="z-9999 rounded-xl border border-slate-200 dark:border-slate-700
                 bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/60 dark:shadow-black/30
                 overflow-hidden animate-in"
    >
      <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-700">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                       bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-white
                       placeholder-slate-400 dark:placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400
                       transition-all"
          />
        </div>
      </div>
      <ul className="py-1 max-h-52 overflow-y-auto">
        {loading ? (
          <li className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500 text-center">Buscando...</li>
        ) : options.length === 0 ? (
          <li className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500 text-center">Sin resultados</li>
        ) : (
          options.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => select(c)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-100
                  ${value === c.id
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }`}
              >
                {c.fullname}
              </button>
            </li>
          ))
        )}
      </ul>
      {!loading && options.length > 0 && (
        <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
          {options.length} resultado{options.length !== 1 ? 's' : ''}. Escriba para refinar.
        </div>
      )}
    </div>,
    document.body
  ) : null

  return (
    <div className="relative w-full">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => open ? close() : openDropdown()}
        className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl border min-h-11
          transition-all duration-150 cursor-pointer text-left
          bg-white dark:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed
          ${error
            ? 'border-rose-400 dark:border-rose-500 ring-rose-400/30'
            : open
              ? 'ring-2 ring-indigo-500/25 border-indigo-400 dark:border-indigo-500'
              : 'border-slate-200 dark:border-slate-700'
          }
          ${selected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
      >
        <span className="truncate">{selected ? selected.fullname : placeholder}</span>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {selected && !disabled && (
            <span
              role="button"
              onClick={clear}
              className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              aria-label="Limpiar selección"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {dropdown}
    </div>
  )
}
