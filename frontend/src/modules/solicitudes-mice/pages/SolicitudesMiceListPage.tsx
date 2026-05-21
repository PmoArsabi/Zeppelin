import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import type { NavigateFn } from '@/modules'
import type { SolicitudMiceRow } from '../types'
import { listSolicitudesMice } from '../services/solicitudesMiceService'
import { fetchMiceCatalogos } from '../services/miceCatalogosService'
import type { MiceCatalogos } from '../types/mice-catalogos'
import { MICE_CATALOGOS_VACIOS } from '../types/mice-catalogos'

interface Props {
  onNew: () => void
  onEdit: (row: SolicitudMiceRow) => void
  onView: (row: SolicitudMiceRow) => void
  onNavigate: NavigateFn
}

interface MiceFilters {
  cliente: string
  anio: string
  sector: string
  probabilidad: string
  estado: string
  /** Búsqueda unificada en MZP y nombre del evento */
  busqueda: string
}

const EMPTY_FILTERS: MiceFilters = {
  cliente: '',
  anio: '',
  sector: '',
  probabilidad: '',
  estado: '',
  busqueda: '',
}

const TH =
  'px-3 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap'
const TD = 'px-3 py-2 text-xs text-slate-600 dark:text-slate-300'

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const s = String(value).slice(0, 10)
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return s
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fmtMoney(n: number | null, currency = 'COP'): string {
  if (n == null) return '—'
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
  }
}

function estadoBadgeVariant(estado: string): 'emerald' | 'rose' | 'amber' {
  if (estado === 'Cerrado') return 'emerald'
  if (estado === 'Cancelado') return 'rose'
  return 'amber'
}

function matchesFilters(row: SolicitudMiceRow, f: MiceFilters): boolean {
  if (f.cliente && row.cliente !== f.cliente) return false
  if (f.anio && String(row.anio) !== f.anio) return false
  if (f.sector && (row.sector ?? '') !== f.sector) return false
  if (f.probabilidad && (row.probabilidad ?? '') !== f.probabilidad) return false
  if (f.estado && row.estado !== f.estado) return false
  if (f.busqueda) {
    const q = f.busqueda.toLowerCase().trim()
    const enMzp = (row.mzp ?? '').toLowerCase().includes(q)
    const enNombre = row.nombre.toLowerCase().includes(q)
    if (!enMzp && !enNombre) return false
  }
  return true
}

function FilterField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{label}</span>
      <Select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="py-2.5 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300"
      >
        <option value="">Todos</option>
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    </div>
  )
}

function FilterSearchField({
  label,
  value,
  onChange,
  placeholder,
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{label}</span>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
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
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                     bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white
                     placeholder-slate-400 dark:placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400
                     transition-all"
        />
      </div>
    </div>
  )
}

function FilterBar({
  filters,
  onChange,
  onClear,
  total,
  filtered,
  options,
}: {
  filters: MiceFilters
  onChange: (f: MiceFilters) => void
  onClear: () => void
  total: number
  filtered: number
  options: {
    clientes: string[]
    anios: string[]
    sectores: string[]
    probabilidades: string[]
    estados: string[]
  }
}) {
  const set = (k: keyof MiceFilters, v: string) => onChange({ ...filters, [k]: v })
  const active = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-4 mb-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pt-1">Filtros</p>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl
                       text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700
                       hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        <FilterField
          label="Cliente"
          value={filters.cliente}
          onChange={v => set('cliente', v)}
          options={options.clientes}
        />
        <FilterField
          label="Año"
          value={filters.anio}
          onChange={v => set('anio', v)}
          options={options.anios}
        />
        <FilterField
          label="Sector"
          value={filters.sector}
          onChange={v => set('sector', v)}
          options={options.sectores}
        />
        <FilterField
          label="Probabilidad"
          value={filters.probabilidad}
          onChange={v => set('probabilidad', v)}
          options={options.probabilidades}
        />
        <FilterField
          label="Estado"
          value={filters.estado}
          onChange={v => set('estado', v)}
          options={options.estados}
        />
        <FilterSearchField
          label="MZP / Nombre"
          value={filters.busqueda}
          onChange={v => set('busqueda', v)}
          placeholder="Buscar por MZP o nombre del evento..."
          className="sm:col-span-2 lg:col-span-2"
        />
      </div>

      {active && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Mostrando <span className="font-semibold text-slate-600 dark:text-slate-300">{filtered}</span> de{' '}
          <span className="font-semibold">{total}</span> registros
        </p>
      )}
    </div>
  )
}

export default function SolicitudesMiceListPage({ onNew, onEdit, onView, onNavigate }: Props) {
  const { user, isAdmin } = useAuth()
  const [rows, setRows] = useState<SolicitudMiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<MiceFilters>(EMPTY_FILTERS)
  const [catalog, setCatalog] = useState<MiceCatalogos>(MICE_CATALOGOS_VACIOS)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const [{ data, error: err }, cat] = await Promise.all([
      listSolicitudesMice(user.id, isAdmin),
      fetchMiceCatalogos(),
    ])
    setCatalog(cat.data)
    if (err) {
      if (err.includes('does not exist') || err.includes('schema cache')) {
        setError(
          'La tabla solicitudes_mice no está creada. Ejecuta database/migrations/001_solicitudes_mice.sql en Supabase.'
        )
      } else {
        setError(err)
      }
      setRows([])
    } else {
      setRows(data ?? [])
    }
    setLoading(false)
  }, [user, isAdmin])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al montar
    void load()
  }, [load])

  const filterOptions = useMemo(() => {
    const estadosSet = new Set(catalog.estados.map(e => e.nombre))
    const probSet = new Set(catalog.probabilidades.map(p => p.nombre))
    const aniosSet = new Set(catalog.anios.map(String))
    const sectoresSet = new Set<string>()
    const clientesSet = new Set<string>()
    for (const r of rows) {
      estadosSet.add(r.estado)
      if (r.probabilidad) probSet.add(r.probabilidad)
      aniosSet.add(String(r.anio))
      if (r.sector?.trim()) sectoresSet.add(r.sector.trim())
      if (r.cliente.trim()) clientesSet.add(r.cliente.trim())
    }
    const sortStr = (a: string, b: string) => a.localeCompare(b, 'es')
    return {
      clientes: [...clientesSet].sort(sortStr),
      anios: [...aniosSet].sort((a, b) => Number(b) - Number(a)),
      sectores: [...sectoresSet].sort(sortStr),
      probabilidades: [...probSet].sort(sortStr),
      estados: [...estadosSet].sort(sortStr),
    }
  }, [rows, catalog])

  const filtered = useMemo(
    () => rows.filter(r => matchesFilters(r, filters)),
    [rows, filters]
  )

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  const countLabel = loading
    ? 'Cargando...'
    : hasActiveFilters
      ? `${filtered.length} de ${rows.length} registro${rows.length !== 1 ? 's' : ''}`
      : `${rows.length} registro${rows.length !== 1 ? 's' : ''}`

  return (
    <AppShell activeModule="solicitudes-mice" onNavigate={onNavigate}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Solicitudes MICE
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{countLabel}</p>
          </div>
          <Button onClick={onNew} size="md">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nueva solicitud
          </Button>
        </div>

        {error && <Alert variant="error" className="mb-5">{error}</Alert>}

        {!loading && rows.length > 0 && (
          <FilterBar
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
            total={rows.length}
            filtered={filtered.length}
            options={filterOptions}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 && !error ? (
          <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800">
            <p className="text-slate-600 dark:text-slate-300 font-semibold mb-1">Sin solicitudes MICE</p>
            <p className="text-sm text-slate-400">Crea la primera solicitud o ejecuta la migración en Supabase.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800">
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Sin resultados para los filtros aplicados.
            </p>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-x-auto">
            <table className="w-full min-w-[960px] text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800 text-left">
                  <th className={TH}>Fecha solicitud</th>
                  <th className={TH}>Cliente</th>
                  <th className={TH}>Sector</th>
                  <th className={TH}>MZP</th>
                  <th className={`${TH} min-w-[140px]`}>Nombre</th>
                  <th className={TH}>Probabilidad</th>
                  <th className={TH}>Estado</th>
                  <th className={`${TH} text-right`}>Valor cotizado</th>
                  <th className={`${TH} text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-50 dark:border-gray-800/80 hover:bg-slate-50/80 dark:hover:bg-gray-800/40"
                  >
                    <td className={`${TD} text-slate-500 dark:text-slate-400 whitespace-nowrap`}>
                      {fmtDate(row.fecha_solicitud)}
                    </td>
                    <td className={`${TD} max-w-[160px] truncate`} title={row.cliente}>
                      {row.cliente}
                    </td>
                    <td className={`${TD} max-w-[100px] truncate text-slate-500`} title={row.sector ?? undefined}>
                      {row.sector ?? '—'}
                    </td>
                    <td className={`${TD} font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap`}>
                      {row.mzp ?? '—'}
                    </td>
                    <td
                      className={`${TD} font-medium text-slate-800 dark:text-slate-100 max-w-[180px] truncate`}
                      title={row.nombre}
                    >
                      {row.nombre}
                    </td>
                    <td className={`${TD} text-slate-500 whitespace-nowrap`}>{row.probabilidad ?? '—'}</td>
                    <td className={TD}>
                      <Badge variant={estadoBadgeVariant(row.estado)} className="text-[10px] px-1.5 py-0">
                        {row.estado}
                      </Badge>
                    </td>
                    <td className={`${TD} text-right whitespace-nowrap tabular-nums`}>
                      {fmtMoney(row.valor_cotizado, row.moneda_cotizacion ?? 'COP')}
                    </td>
                    <td className={`${TD} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onView(row)}
                          title="Ver cotización"
                          aria-label="Ver cotización"
                          className="w-7 h-7 flex items-center justify-center rounded-lg
                                     text-slate-400 hover:text-indigo-600 hover:bg-indigo-50
                                     dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          title="Editar cotización"
                          aria-label="Editar cotización"
                          className="w-7 h-7 flex items-center justify-center rounded-lg
                                     text-slate-400 hover:text-amber-600 hover:bg-amber-50
                                     dark:hover:text-amber-400 dark:hover:bg-amber-500/10 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasActiveFilters && (
              <p className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-gray-800">
                {filtered.length} registro{filtered.length !== 1 ? 's' : ''} (de {rows.length} total)
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
