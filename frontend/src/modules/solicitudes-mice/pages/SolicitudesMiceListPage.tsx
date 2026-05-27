import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import Button from '@/components/ui/Button'
import PageTitle from '@/components/ui/PageTitle'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import CollapsibleFilterPanel from '@/components/filters/CollapsibleFilterPanel'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import FilterSearchField from '@/components/filters/FilterSearchField'
import type { NavigateFn } from '@/modules'
import type { SolicitudMiceRow } from '../types'
import { listSolicitudesMice } from '../services/solicitudesMiceService'
import { fetchMiceCatalogos } from '../services/miceCatalogosService'
import type { MiceCatalogos } from '../types/mice-catalogos'
import { MICE_CATALOGOS_VACIOS } from '../types/mice-catalogos'
import { formatDateDDMMYYYY } from '@/lib/formatDate'
import MiceEstadoKpiBar, { buildMiceEstadoKpiItems } from '../components/MiceEstadoKpiBar'

interface Props {
  onNew: () => void
  onEdit: (row: SolicitudMiceRow) => void
  onView: (row: SolicitudMiceRow) => void
  onNavigate: NavigateFn
}

interface MiceFilters {
  cliente: string[]
  responsable: string[]
  anio: string[]
  sector: string[]
  probabilidad: string[]
  estado: string[]
  /** Búsqueda unificada en MZP, nombre y cliente */
  busqueda: string
}

const EMPTY_FILTERS: MiceFilters = {
  cliente: [],
  responsable: [],
  anio: [],
  sector: [],
  probabilidad: [],
  estado: [],
  busqueda: '',
}

function matchesMulti(selected: string[], rowValue: string): boolean {
  if (selected.length === 0) return true
  return selected.includes(rowValue)
}

const TH =
  'px-3 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap'
const TD = 'px-3 py-1.5 text-[11px] leading-snug text-slate-600 dark:text-slate-300'

/** Moneda + valor, ej. COP 1.250.000 */
function fmtMoney(n: number | null, currency = 'COP'): string {
  if (n == null) return '—'
  const code = (currency || 'COP').trim().toUpperCase()
  const amount = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
  return `${code} ${amount}`
}

function estadoBadgeVariant(estado: string): 'emerald' | 'rose' | 'amber' {
  if (estado === 'Cerrado') return 'emerald'
  if (estado === 'Cancelado') return 'rose'
  return 'amber'
}

function matchesFilters(row: SolicitudMiceRow, f: MiceFilters): boolean {
  if (f.cliente.length && !matchesMulti(f.cliente, row.cliente ?? '')) return false
  if (!matchesMulti(f.responsable, (row.responsable_nombre ?? '').trim())) return false
  if (!matchesMulti(f.anio, String(row.anio))) return false
  if (!matchesMulti(f.sector, row.sector ?? '')) return false
  if (!matchesMulti(f.probabilidad, row.probabilidad ?? '')) return false
  if (!matchesMulti(f.estado, row.estado)) return false
  if (f.busqueda) {
    const q = f.busqueda.toLowerCase().trim()
    const enMzp = (row.mzp ?? '').toLowerCase().includes(q)
    const enNombre = row.nombre.toLowerCase().includes(q)
    const enCliente = (row.cliente ?? '').toLowerCase().includes(q)
    if (!enMzp && !enNombre && !enCliente) return false
  }
  return true
}

/** Más reciente primero (fecha solicitud ↓, luego created_at ↓) */
function compareByFechaSolicitudDesc(a: SolicitudMiceRow, b: SolicitudMiceRow): number {
  const fa = a.fecha_solicitud || ''
  const fb = b.fecha_solicitud || ''
  if (fa !== fb) return fb.localeCompare(fa)
  return (b.created_at || '').localeCompare(a.created_at || '')
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
    responsables: string[]
    anios: string[]
    sectores: string[]
    probabilidades: string[]
    estados: string[]
  }
}) {
  const set = (k: 'busqueda', v: string) => onChange({ ...filters, [k]: v })
  const setMulti = (
    k: 'cliente' | 'responsable' | 'anio' | 'sector' | 'probabilidad' | 'estado',
    v: string[]
  ) => onChange({ ...filters, [k]: v })
  const active = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  return (
    <CollapsibleFilterPanel
      active={active}
      onClear={onClear}
      total={total}
      filtered={filtered}
      storageKey="zeppelin.filters.mice.expanded"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <FilterSearchField
          label="Buscar"
          value={filters.busqueda}
          onChange={v => set('busqueda', v)}
          placeholder="MZP, nombre del evento o cliente..."
          className="sm:col-span-2 lg:col-span-4"
        />
        <FilterMultiSelect
          label="Cliente"
          value={filters.cliente}
          onChange={v => setMulti('cliente', v)}
          options={options.clientes}
        />
        <FilterMultiSelect
          label="Responsable"
          value={filters.responsable}
          onChange={v => setMulti('responsable', v)}
          options={options.responsables}
        />
        <FilterMultiSelect
          label="Año"
          value={filters.anio}
          onChange={v => setMulti('anio', v)}
          options={options.anios}
        />
        <FilterMultiSelect
          label="Sector"
          value={filters.sector}
          onChange={v => setMulti('sector', v)}
          options={options.sectores}
        />
        <FilterMultiSelect
          label="Probabilidad"
          value={filters.probabilidad}
          onChange={v => setMulti('probabilidad', v)}
          options={options.probabilidades}
        />
        <FilterMultiSelect
          label="Estado"
          value={filters.estado}
          onChange={v => setMulti('estado', v)}
          options={options.estados}
        />
      </div>
    </CollapsibleFilterPanel>
  )
}

function MiceRowActions({
  row,
  onView,
  onEdit,
  canEdit,
  layout,
}: {
  row: SolicitudMiceRow
  onView: (row: SolicitudMiceRow) => void
  onEdit: (row: SolicitudMiceRow) => void
  canEdit: boolean
  layout: 'icons' | 'buttons'
}) {
  if (layout === 'icons') {
    return (
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        {canEdit && (
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onView(row)}
        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl
                   text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10
                   hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Ver
      </button>
      {canEdit && (
        <button
          type="button"
          onClick={() => onEdit(row)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl
                     text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10
                     hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
      )}
    </div>
  )
}

function MiceSolicitudMobileCard({
  row,
  onView,
  onEdit,
  canEdit,
}: {
  row: SolicitudMiceRow
  onView: (row: SolicitudMiceRow) => void
  onEdit: (row: SolicitudMiceRow) => void
  canEdit: boolean
}) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
            {row.mzp ?? '—'}
          </p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 mt-0.5">
            {row.nombre}
          </p>
        </div>
        <Badge variant={estadoBadgeVariant(row.estado)} className="text-[10px] px-1.5 py-0 shrink-0 max-w-[45%] truncate">
          {row.estado}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs mb-3">
        <div className="min-w-0 col-span-2">
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            Cliente
          </span>
          <p className="text-slate-800 dark:text-slate-200 font-medium truncate" title={row.cliente}>
            {row.cliente}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            Fecha
          </span>
          <p className="text-slate-600 dark:text-slate-300">{formatDateDDMMYYYY(row.fecha_solicitud)}</p>
        </div>
        <div>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            Sector
          </span>
          <p className="text-slate-600 dark:text-slate-300 truncate">{row.sector ?? '—'}</p>
        </div>
        <div>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            Prob.
          </span>
          <p className="text-slate-600 dark:text-slate-300">{row.probabilidad ?? '—'}</p>
        </div>
        <div>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            Valor
          </span>
          <p className="text-slate-800 dark:text-slate-200 font-medium tabular-nums">
            {fmtMoney(row.valor_cotizado, row.moneda_cotizacion ?? 'COP')}
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-gray-800">
        <MiceRowActions row={row} onView={onView} onEdit={onEdit} canEdit={canEdit} layout="buttons" />
      </div>
    </article>
  )
}

export default function SolicitudesMiceListPage({ onNew, onEdit, onView, onNavigate }: Props) {
  const { user, isAdmin, hasPermission } = useAuth()
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
          'La tabla th_solicitud_mice no está creada. Ejecuta database/MICE_LIMPIAR_COLUMNAS_CABECERA.sql en Supabase.'
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
    const responsablesSet = new Set<string>()
    for (const r of rows) {
      estadosSet.add(r.estado)
      if (r.probabilidad) probSet.add(r.probabilidad)
      aniosSet.add(String(r.anio))
      if (r.sector?.trim()) sectoresSet.add(r.sector.trim())
      if (r.cliente?.trim()) clientesSet.add(r.cliente.trim())
      const resp = r.responsable_nombre?.trim()
      if (resp) responsablesSet.add(resp)
    }
    const sortStr = (a: string, b: string) => a.localeCompare(b, 'es')
    return {
      clientes: [...clientesSet].sort(sortStr),
      responsables: [...responsablesSet].sort(sortStr),
      anios: [...aniosSet].sort((a, b) => Number(b) - Number(a)),
      sectores: [...sectoresSet].sort(sortStr),
      probabilidades: [...probSet].sort(sortStr),
      estados: [...estadosSet].sort(sortStr),
    }
  }, [rows, catalog])

  const filtered = useMemo(() => {
    return rows
      .filter(r => matchesFilters(r, filters))
      .sort(compareByFechaSolicitudDesc)
  }, [rows, filters])

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  const estadoKpis = useMemo(() => buildMiceEstadoKpiItems(filtered), [filtered])

  const countLabel = loading
    ? 'Cargando...'
    : hasActiveFilters
      ? `${filtered.length} de ${rows.length} registro${rows.length !== 1 ? 's' : ''}`
      : `${rows.length} registro${rows.length !== 1 ? 's' : ''}`

  return (
    <AppShell activeModule="solicitudes-mice" onNavigate={onNavigate}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div className="min-w-0">
            <PageTitle>Solicitudes MICE</PageTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{countLabel}</p>
          </div>
          {hasPermission('mice', 'crear') && (
            <Button onClick={onNew} size="md" className="w-full sm:w-auto shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Nueva solicitud
            </Button>
          )}
        </div>

        {error && <Alert variant="error" className="mb-5">{error}</Alert>}

        {!loading && rows.length > 0 && (
          <MiceEstadoKpiBar
            items={estadoKpis}
            total={filtered.length}
            activeEstados={filters.estado}
            filteredView={hasActiveFilters}
            onToggleEstado={nombre => {
              const only = filters.estado.length === 1 && filters.estado[0] === nombre
              setFilters({ ...filters, estado: only ? [] : [nombre] })
            }}
            onClearEstadoFilter={() => setFilters({ ...filters, estado: [] })}
          />
        )}

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
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[1040px] text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-800 text-left">
                    <th className={TH}>Fecha solicitud</th>
                    <th className={TH}>Cliente</th>
                    <th className={TH}>Responsable</th>
                    <th className={TH}>Sector</th>
                    <th className={TH}>MZP</th>
                    <th className={`${TH} min-w-[140px]`}>Nombre</th>
                    <th className={TH}>Prob</th>
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
                        {formatDateDDMMYYYY(row.fecha_solicitud)}
                      </td>
                      <td className={`${TD} max-w-[160px] truncate`} title={row.cliente}>
                        {row.cliente}
                      </td>
                      <td className={`${TD} max-w-[140px] truncate`} title={row.responsable_nombre}>
                        {row.responsable_nombre || '—'}
                      </td>
                      <td className={`${TD} max-w-[100px] truncate text-slate-500`} title={row.sector ?? undefined}>
                        {row.sector ?? '—'}
                      </td>
                      <td className={`${TD} font-mono text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap`}>
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
                        <MiceRowActions row={row} onView={onView} onEdit={onEdit} canEdit={hasPermission('mice', 'editar')} layout="icons" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100 dark:divide-gray-800">
              {filtered.map(row => (
                <MiceSolicitudMobileCard key={row.id} row={row} onView={onView} onEdit={onEdit} canEdit={hasPermission('mice', 'editar')} />
              ))}
            </div>

            {hasActiveFilters && (
              <p className="px-3 sm:px-4 py-3 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-gray-800">
                {filtered.length} registro{filtered.length !== 1 ? 's' : ''} (de {rows.length} total)
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
