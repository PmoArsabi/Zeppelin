import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface FilterDateRangeFieldProps {
  label: string
  desde: string
  hasta: string
  onChangeDesde: (v: string) => void
  onChangeHasta: (v: string) => void
  className?: string
}

const DIAS = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function parseISO(v: string): Date | null {
  if (!v) return null
  const [y, m, d] = v.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDisplay(v: string): string {
  const d = parseISO(v)
  if (!d) return ''
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

interface DropdownPos { top: number; left: number }

function Calendar({
  value,
  onSelect,
  onToday,
  onClear,
}: {
  value: string
  onSelect: (iso: string) => void
  onToday: () => void
  onClear: () => void
}) {
  const selected = parseISO(value)
  const [cursor, setCursor] = useState(() => selected ?? new Date())

  const weeks = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const startOffset = firstOfMonth.getDay()
    const start = new Date(year, month, 1 - startOffset)

    const days: Date[] = []
    for (let i = 0; i < 42; i++) {
      days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
    }
    const rows: Date[][] = []
    for (let i = 0; i < 6; i++) rows.push(days.slice(i * 7, i * 7 + 7))
    return rows
  }, [cursor])

  const today = new Date()

  return (
    <div className="p-3 w-64">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Mes anterior"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">
          {MESES[cursor.getMonth()]} de {cursor.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Mes siguiente"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DIAS.map(d => (
          <span key={d} className="text-[10px] font-semibold text-center text-indigo-500 dark:text-indigo-400 py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {weeks.flat().map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth()
          const isSelected = sameDay(d, selected)
          const isToday = sameDay(d, today)
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(toISO(d))}
              className={`w-7.5 h-7.5 flex items-center justify-center rounded-full text-xs transition-colors
                ${isSelected
                  ? 'bg-indigo-600 text-white font-semibold'
                  : isToday
                    ? 'text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-500/15'
                    : inMonth
                      ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Borrar
        </button>
        <button
          type="button"
          onClick={onToday}
          className="text-[11px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Hoy
        </button>
      </div>
    </div>
  )
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<DropdownPos | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const close = () => setOpen(false)

  const openDropdown = () => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
    setOpen(true)
  }

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

  useEffect(() => {
    if (!open) return
    const reposition = () => {
      if (!btnRef.current) return
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
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

  const dropdown = open && pos ? createPortal(
    <div
      ref={dropRef}
      style={{ position: 'absolute', top: pos.top, left: pos.left }}
      className="z-9999 rounded-xl border border-slate-200 dark:border-slate-700
                 bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/60 dark:shadow-black/30 overflow-hidden"
    >
      <Calendar
        value={value}
        onSelect={iso => { onChange(iso); close() }}
        onToday={() => { onChange(toISO(new Date())); close() }}
        onClear={() => { onChange(''); close() }}
      />
    </div>,
    document.body,
  ) : null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => open ? close() : openDropdown()}
        aria-label={label}
        className={`min-h-8 flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border text-left
                    transition-all duration-150 cursor-pointer
                    bg-slate-50 dark:bg-slate-800/60
                    ${open
                      ? 'ring-2 ring-indigo-500/25 border-indigo-400 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-700'
                    }
                    ${value ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
      >
        {value ? fmtDisplay(value) : 'dd/mm/aaaa'}
      </button>
      {dropdown}
    </>
  )
}

export default function FilterDateRangeField({
  label,
  desde,
  hasta,
  onChangeDesde,
  onChangeHasta,
  className = '',
}: FilterDateRangeFieldProps) {
  return (
    <div className={`flex flex-col gap-0.5 min-w-0 ${className}`}>
      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-tight">{label}</span>
      <div className="flex items-center gap-1.5">
        <DateInput label={`${label} desde`} value={desde} onChange={onChangeDesde} />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">a</span>
        <DateInput label={`${label} hasta`} value={hasta} onChange={onChangeHasta} />
      </div>
    </div>
  )
}
