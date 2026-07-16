import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import PageTitle from '@/components/ui/PageTitle'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import CollapsibleFilterPanel from '@/components/filters/CollapsibleFilterPanel'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import FilterSearchField from '@/components/filters/FilterSearchField'
import type { SolicitudMiceRow } from '../types'
import { listSolicitudesMice } from '../services/solicitudesMiceService'
import { fetchMiceCatalogos } from '../services/miceCatalogosService'
import type { MiceCatalogos } from '../types/mice-catalogos'
import { MICE_CATALOGOS_VACIOS } from '../types/mice-catalogos'
import { formatDateDDMMYYYY } from '@/lib/formatDate'
import MiceEstadoKpiBar, { buildMiceEstadoKpiItems } from '../components/MiceEstadoKpiBar'
import { estadoColor } from '../lib/estadoColors'

// ── KPI Matrix helpers ────────────────────────────────────────────────────────

const ESTADO_ORDER = ['Cotización enviada', 'En cotización', 'En cierre', 'En operación']

function sortBySpanish(a: string, b: string) { return a.localeCompare(b, 'es') }

function sortEstados(estados: string[]): string[] {
  const order = new Map(ESTADO_ORDER.map((e, i) => [e.toLowerCase(), i]))
  return [...estados].sort((a, b) => {
    const ia = order.get(a.toLowerCase()) ?? 99
    const ib = order.get(b.toLowerCase()) ?? 99
    return ia !== ib ? ia - ib : sortBySpanish(a, b)
  })
}

function rowResponsable(row: SolicitudMiceRow) { return row.responsable_nombre?.trim() || 'Sin responsable' }
function rowEstado(row: SolicitudMiceRow)      { return row.estado?.trim() || 'Sin estado' }
function rowAnio(row: SolicitudMiceRow)        { return String(row.anio || row.fecha_solicitud?.slice(0, 4) || 'Sin año') }

const DIAS_ALERTA = 3
const DIAS_ALERTA_SEGUIMIENTO = 2

const DIAS_ALERTA_POR_ETAPA: Record<string, number> = {
  cotizacion_enviada: DIAS_ALERTA,
  seguimiento: DIAS_ALERTA_SEGUIMIENTO,
}

function diasAlertaParaRow(row: SolicitudMiceRow): number | null {
  const etapaCodigo = row.estado?.toLowerCase().replace(/\s+/g, '_')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/é/g, 'e').replace(/á/g, 'a').replace(/í/g, 'i')
  return DIAS_ALERTA_POR_ETAPA[etapaCodigo ?? ''] ?? null
}

/** Retorna true si la solicitud lleva más días sin actividad de los permitidos para su etapa */
function necesitaSeguimiento(row: SolicitudMiceRow): boolean {
  const dias = diasAlertaParaRow(row)
  if (dias == null) return false
  const ref = row.updated_at
  if (!ref) return false
  const diasSinActividad = (Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24)
  return diasSinActividad > dias
}

const ESTADOS_ANTES_DE_CIERRE = ['en_cotizacion', 'cotizacion_enviada', 'seguimiento', 'en_operacion']

/** Retorna true si ya pasó la fecha del evento (fin) y la solicitud aún no está en cierre o posterior */
function necesitaPasarACierre(row: SolicitudMiceRow): boolean {
  const etapaCodigo = row.estado?.toLowerCase().replace(/\s+/g, '_')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/é/g, 'e').replace(/á/g, 'a').replace(/í/g, 'i')
  if (!ESTADOS_ANTES_DE_CIERRE.includes(etapaCodigo ?? '')) return false
  if (!row.fin) return false
  return new Date(row.fin).getTime() < Date.now()
}



interface ResponsableKpi {
  responsable: string
  total: number
  estados: Map<string, number>
}

function MiceResponsableMatrix({
  rows,
  filters,
  onFiltersChange,
  expanded,
  onToggleExpanded,
}: {
  rows: SolicitudMiceRow[]
  filters: MiceFilters
  onFiltersChange: (f: MiceFilters) => void
  expanded: boolean
  onToggleExpanded: () => void
}) {
  const [selectedResp, setSelectedResp] = useState<string | null>(null)

  // Cuando cambia el filtro de responsable desde el FilterBar externo, sincroniza la selección visual
  useEffect(() => {
    if (filters.responsable.length === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedResp(filters.responsable[0])
    } else {
      setSelectedResp(null)
    }
  }, [filters.responsable])

  // La matriz filtra por año y estado del panel compartido (no por responsable — lo muestra todo)
  const filteredRows = useMemo(() => rows.filter(r => {
    if (filters.anio.length   && !filters.anio.includes(rowAnio(r)))     return false
    if (filters.estado.length && !filters.estado.includes(rowEstado(r))) return false
    return true
  }), [rows, filters])

  const estadoColumns = useMemo(() => {
    const s = new Set<string>()
    for (const r of filteredRows) s.add(rowEstado(r))
    return sortEstados([...s])
  }, [filteredRows])

  const responsableKpis = useMemo<ResponsableKpi[]>(() => {
    const map = new Map<string, ResponsableKpi>()
    for (const r of filteredRows) {
      const resp = rowResponsable(r)
      const est  = rowEstado(r)
      const cur = map.get(resp) ?? { responsable: resp, total: 0, estados: new Map() }
      cur.total++
      cur.estados.set(est, (cur.estados.get(est) ?? 0) + 1)
      map.set(resp, cur)
    }
    return [...map.values()].sort((a, b) => b.total - a.total || sortBySpanish(a.responsable, b.responsable))
  }, [filteredRows])

  const estadoTotals = useMemo(() => {
    const t = new Map<string, number>()
    for (const r of filteredRows) t.set(rowEstado(r), (t.get(rowEstado(r)) ?? 0) + 1)
    return t
  }, [filteredRows])

  const totalGeneral = filteredRows.length
  const maxTotal = Math.max(1, ...responsableKpis.map(r => r.total))
  const hasSelection = selectedResp !== null

  const handleClickResponsable = (resp: string) => {
    const toggled = selectedResp === resp ? null : resp
    setSelectedResp(toggled)
    onFiltersChange({ ...filters, responsable: toggled ? [toggled] : [] })
  }

  const handleClickCelda = (resp: string, estado: string) => {
    setSelectedResp(resp)
    onFiltersChange({ ...filters, responsable: [resp], estado: [estado] })
  }

  const handleClickEstado = (estado: string) => {
    setSelectedResp(null)
    onFiltersChange({ ...filters, estado: [estado], responsable: [] })
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm mb-4 overflow-visible">
      {/* Header — mismo patrón que CollapsibleFilterPanel */}
      <div className="px-3 sm:px-4 py-3 flex items-center justify-between gap-2 sm:gap-3 flex-wrap relative z-10 overflow-visible">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="flex items-center gap-2 text-left min-w-0 rounded-lg -ml-1 px-1 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          <svg
            className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Carga por responsable</span>
          {hasSelection && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
              Activos
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleExpanded}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
          >
            {expanded ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>

      <div className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
        <div className="border-t border-slate-200 dark:border-gray-700" />
        <div className="overflow-x-auto overflow-y-hidden rounded-b-2xl">
        <table className="w-full min-w-190 text-xs">
          <thead>
            <tr className="text-left border-b border-slate-200 dark:border-gray-700">
              <th className="px-4 py-3 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 w-52">
                Responsable
              </th>
              {estadoColumns.map(estado => (
                <th key={estado} className="px-3 py-3 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 text-right">
                  <button
                    type="button"
                    onClick={() => handleClickEstado(estado)}
                    className="rounded-lg px-1.5 py-0.5 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                    title={`Filtrar tabla por estado "${estado}"`}
                  >
                    {estado}
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {responsableKpis.length === 0 ? (
              <tr>
                <td colSpan={estadoColumns.length + 2} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  Sin datos para los filtros aplicados.
                </td>
              </tr>
            ) : (
              responsableKpis
                .filter(stat => selectedResp === null || stat.responsable === selectedResp)
                .map(stat => {
                const isSelected = selectedResp === stat.responsable
                return (
                  <tr
                    key={stat.responsable}
                    className={`border-b border-slate-200 dark:border-gray-700 last:border-b-0 transition-colors
                      ${isSelected
                        ? 'bg-indigo-50/60 dark:bg-indigo-500/10'
                        : 'hover:bg-slate-50/60 dark:hover:bg-gray-800/30'
                      }`}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleClickResponsable(stat.responsable)}
                        className="w-full text-left group"
                        title={isSelected ? `Quitar filtro de ${stat.responsable}` : `Filtrar por ${stat.responsable}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className={`font-semibold truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                            {stat.responsable}
                          </span>
                          {/* Porcentaje siempre sobre el total general, no sobre el seleccionado */}
                          <span className="shrink-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                            {totalGeneral > 0 ? `${Math.round((stat.total / totalGeneral) * 100)}%` : '0%'}
                          </span>
                        </span>
                        <span className="block mt-1 h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <span
                            className={`block h-full rounded-full transition-colors ${isSelected ? 'bg-indigo-600' : 'bg-indigo-500 group-hover:bg-indigo-600'}`}
                            style={{ width: `${(stat.total / maxTotal) * 100}%` }}
                          />
                        </span>
                      </button>
                    </td>
                    {estadoColumns.map(estado => {
                      const count = stat.estados.get(estado) ?? 0
                      return (
                        <td key={estado} className="px-3 py-3 text-right">
                          {count > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleClickCelda(stat.responsable, estado)}
                              className={`inline-flex min-w-8 justify-center rounded-lg px-2 py-1 font-semibold transition-colors
                                ${isSelected
                                  ? 'text-indigo-800 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-500/20 hover:bg-indigo-200 dark:hover:bg-indigo-500/30'
                                  : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                                }`}
                              title={`Filtrar tabla: ${stat.responsable} / ${estado}`}
                            >
                              {count}
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleClickResponsable(stat.responsable)}
                        className={`font-bold ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                      >
                        {stat.total}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {responsableKpis.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 dark:bg-gray-800/60 border-t border-slate-200 dark:border-gray-700">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">Total general</td>
                {estadoColumns.map(estado => (
                  <td key={estado} className="px-3 py-3 text-right font-bold text-slate-800 dark:text-slate-100">
                    <button
                      type="button"
                      onClick={() => handleClickEstado(estado)}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      {estadoTotals.get(estado) ?? 0}
                    </button>
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{totalGeneral}</td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>{/* overflow-x-auto */}
        </div>{/* overflow-hidden */}
      </div>{/* grid animado */}
    </div>
  )
}

interface Props {
  onNew: () => void
  onEdit: (row: SolicitudMiceRow) => void
  onView: (row: SolicitudMiceRow) => void
  initialFilters?: Partial<MiceFilters>
}

export interface MiceFilters {
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
const TD = 'px-3 py-2.5 text-[11px] leading-snug text-slate-600 dark:text-slate-300 align-top'

const PAGE_SIZE = 20

function TwoLines({ top, bottom }: { top: React.ReactNode; bottom?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      {top !== null && (
        <p className="text-slate-700 dark:text-slate-300 truncate">{top ?? '—'}</p>
      )}
      {bottom !== null && bottom !== undefined && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
          {bottom}
        </p>
      )}
    </div>
  )
}

/** Moneda + valor, ej. COP 1.250.000 */
function fmtMoney(n: number | null, currency = 'COP'): string {
  if (n == null) return '—'
  const code = (currency || 'COP').trim().toUpperCase()
  const amount = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
  return `${code} ${amount}`
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
  forceExpandTrigger,
}: {
  filters: MiceFilters
  onChange: (f: MiceFilters) => void
  onClear: () => void
  total: number
  filtered: number
  forceExpandTrigger?: number
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
      defaultExpanded={false}
      forceExpandTrigger={forceExpandTrigger}
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
  const esCerrado = row.estado?.toLowerCase().replace(/\s+/g, '_') === 'cerrado'
  const puedeEditar = canEdit && !esCerrado

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
        {puedeEditar && (
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
      {puedeEditar && (
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
  const alerta = necesitaSeguimiento(row)
  const alertaCierre = necesitaPasarACierre(row)
  return (
    <article className={`p-4 ${alerta || alertaCierre ? 'bg-rose-50/60 dark:bg-rose-900/10' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
            {row.mzp ?? '—'}
          </p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 mt-0.5">
            {row.nombre}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            colorHex={estadoColor(row.estado).hex}
            bgHex={estadoColor(row.estado).bg}
            bgHexDark={estadoColor(row.estado).bgDark}
            className="text-[10px] px-1.5 py-0 max-w-[45%] truncate"
          >
            {row.estado}
          </Badge>
          {alerta && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 whitespace-nowrap">
              +{diasAlertaParaRow(row)}d sin actividad
            </span>
          )}
          {alertaCierre && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 whitespace-nowrap">
              Pasar a En cierre
            </span>
          )}
        </div>
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

export default function SolicitudesMiceListPage({ onNew, onEdit, onView, initialFilters }: Props) {
  const { user, hasPermission, role } = useAuth()
  const canSeeMatrix = role === 'admin' || role === 'coordinador'
  const [rows, setRows] = useState<SolicitudMiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<MiceFilters>({ ...EMPTY_FILTERS, ...initialFilters })
  const [catalog, setCatalog] = useState<MiceCatalogos>(MICE_CATALOGOS_VACIOS)
  const [page, setPage] = useState(1)
  const [matrixExpanded, setMatrixExpanded] = useState(() => {
    const s = localStorage.getItem('zeppelin.mice.matrix.expanded')
    return s === null ? false : s === 'true'
  })

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const [{ data, error: err }, cat] = await Promise.all([
      listSolicitudesMice(),
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
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
  }, [filters, rows])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  )

  const estadoKpis = useMemo(() => buildMiceEstadoKpiItems(filtered), [filtered])

  const countLabel = loading
    ? 'Cargando...'
    : hasActiveFilters
      ? `${filtered.length} de ${rows.length} registro${rows.length !== 1 ? 's' : ''}`
      : `${rows.length} registro${rows.length !== 1 ? 's' : ''}`

  return (
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

        {!loading && rows.length > 0 && canSeeMatrix && (
          <MiceResponsableMatrix
            rows={rows}
            filters={filters}
            onFiltersChange={setFilters}
            expanded={matrixExpanded}
            onToggleExpanded={() => {
              setMatrixExpanded(v => {
                const next = !v
                localStorage.setItem('zeppelin.mice.matrix.expanded', String(next))
                return next
              })
            }}
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
              <table className="w-full min-w-220 text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-800 text-left">
                    <th className={TH}>Fecha / Solicitud</th>
                    <th className={TH}>Cliente / Sector</th>
                    <th className={TH}>Responsable</th>
                    <th className={`${TH} min-w-35`}>MZP / Nombre</th>
                    <th className={TH}>Estado</th>
                    <th className={`${TH} text-right`}>Valor cotizado</th>
                    <th className={`${TH} text-right`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(row => {
                    const alerta = necesitaSeguimiento(row)
                    const alertaCierre = necesitaPasarACierre(row)
                    return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 dark:border-gray-800/80 hover:bg-slate-50/80 dark:hover:bg-gray-800/40
                        ${alerta || alertaCierre ? 'bg-rose-50/60 dark:bg-rose-900/10 hover:bg-rose-50 dark:hover:bg-rose-900/20' : ''}`}
                      title={alerta ? `Sin actividad hace más de ${diasAlertaParaRow(row)} días` : alertaCierre ? 'La fecha del evento ya pasó — debe pasar a En cierre' : undefined}
                    >
                      <td className={`${TD} whitespace-nowrap`}>
                        <TwoLines
                          top={formatDateDDMMYYYY(row.fecha_solicitud)}
                          bottom={row.probabilidad ? `Prob: ${row.probabilidad}` : null}
                        />
                      </td>
                      <td className={`${TD} max-w-45`}>
                        <TwoLines top={row.cliente} bottom={row.sector ?? '—'} />
                      </td>
                      <td className={`${TD} max-w-35 truncate`} title={row.responsable_nombre}>
                        {row.responsable_nombre || '—'}
                      </td>
                      <td className={`${TD} max-w-45`}>
                        <TwoLines
                          top={<span className="font-mono text-[10px]">{row.mzp ?? '—'}</span>}
                          bottom={<span title={row.nombre}>{row.nombre}</span>}
                        />
                      </td>
                      <td className={TD}>
                        <div className="flex flex-col gap-1">
                          <Badge
                            colorHex={estadoColor(row.estado).hex}
                            bgHex={estadoColor(row.estado).bg}
                            bgHexDark={estadoColor(row.estado).bgDark}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {row.estado}
                          </Badge>
                          {alerta && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 whitespace-nowrap">
                              +{diasAlertaParaRow(row)}d sin actividad
                            </span>
                          )}
                          {alertaCierre && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 whitespace-nowrap">
                              Pasar a En cierre
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${TD} text-right whitespace-nowrap tabular-nums font-semibold text-slate-800 dark:text-white`}>
                        {fmtMoney(row.valor_cotizado, row.moneda_cotizacion ?? 'COP')}
                      </td>
                      <td className={`${TD} text-right`}>
                        <MiceRowActions row={row} onView={onView} onEdit={onEdit} canEdit={hasPermission('mice', 'editar')} layout="icons" />
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100 dark:divide-gray-800">
              {paged.map(row => (
                <MiceSolicitudMobileCard key={row.id} row={row} onView={onView} onEdit={onEdit} canEdit={hasPermission('mice', 'editar')} />
              ))}
            </div>

            <Pagination
              page={currentPage}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
            />

            {hasActiveFilters && (
              <p className="px-3 sm:px-4 py-3 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-gray-800">
                {filtered.length} registro{filtered.length !== 1 ? 's' : ''} (de {rows.length} total)
              </p>
            )}
          </div>
        )}
      </div>
  )
}
