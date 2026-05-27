import { useEffect, useMemo, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Badge, { type BadgeVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import FilterSearchField from '@/components/filters/FilterSearchField'
import MiceEstadoKpiBar, { buildMiceEstadoKpiItems } from '../components/MiceEstadoKpiBar'
import { listSolicitudesMice } from '../services/solicitudesMiceService'
import type { SolicitudMiceRow } from '../types'
import type { MiceFilters } from './SolicitudesMiceListPage'

interface Props {
  /** Cuando el usuario hace clic en una celda, aplica filtros en la tab lista */
  onDrillToList: (filters: Partial<MiceFilters>) => void
}

interface KpiFilters {
  anios: string[]
  estados: string[]
  responsables: string[]
  busqueda: string
}

const EMPTY_FILTERS: KpiFilters = { anios: [], estados: [], responsables: [], busqueda: '' }
const CURRENT_YEAR = String(new Date().getFullYear())
const DEFAULT_ESTADOS = ['Cotización enviada', 'En cierre', 'En cotización', 'En operación']

function normalizeEstado(s: string) { return s.trim().toLowerCase() }

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

function estadoVariant(estado: string): BadgeVariant {
  const n = estado.toLowerCase()
  if (n.includes('operación') || n.includes('operacion')) return 'emerald'
  if (n.includes('cierre'))  return 'violet'
  if (n.includes('cotización') || n.includes('cotizacion')) return 'blue'
  if (n.includes('enviada')) return 'amber'
  return 'slate'
}

function matchesFilters(row: SolicitudMiceRow, f: KpiFilters): boolean {
  if (f.anios.length && !f.anios.includes(rowAnio(row))) return false
  if (f.estados.length && !f.estados.includes(rowEstado(row))) return false
  if (f.responsables.length && !f.responsables.includes(rowResponsable(row))) return false
  const q = f.busqueda.trim().toLowerCase()
  if (q) {
    const hay = [row.mzp, row.nombre, row.cliente, rowResponsable(row), rowEstado(row), row.sector].join(' ').toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}

interface ResponsableKpi {
  responsable: string
  total: number
  estados: Map<string, number>
}

export default function MiceKpiPage({ onDrillToList }: Props) {
  const [rows, setRows]   = useState<SolicitudMiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<KpiFilters>(EMPTY_FILTERS)
  const [defaultYearApplied, setDefaultYearApplied]     = useState(false)
  const [defaultEstadosApplied, setDefaultEstadosApplied] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    listSolicitudesMice().then(({ data, error: err }) => {
      if (err) setError(err)
      setRows(data ?? [])
      setLoading(false)
    })
  }, [])

  const filteredRows = useMemo(() => rows.filter(r => matchesFilters(r, filters)), [rows, filters])

  const options = useMemo(() => {
    const anios = new Set<string>()
    const estados = new Set<string>()
    const responsables = new Set<string>()
    for (const r of rows) { anios.add(rowAnio(r)); estados.add(rowEstado(r)); responsables.add(rowResponsable(r)) }
    return {
      anios: [...anios].sort((a, b) => Number(b) - Number(a)),
      estados: sortEstados([...estados]),
      responsables: [...responsables].sort(sortBySpanish),
    }
  }, [rows])

  // Defaults: año actual y estados principales al primer load
  useEffect(() => {
    if (defaultYearApplied || loading || rows.length === 0 || filters.anios.length > 0) return
    const years = new Set(rows.map(rowAnio))
    if (years.has(CURRENT_YEAR)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilters(prev => prev.anios.length > 0 ? prev : { ...prev, anios: [CURRENT_YEAR] })
    }
     
    setDefaultYearApplied(true)
  }, [defaultYearApplied, loading, rows, filters.anios.length])

  useEffect(() => {
    if (defaultEstadosApplied || loading || rows.length === 0 || filters.estados.length > 0) return
    const byNorm = new Map<string, string>()
    for (const r of rows) { const e = rowEstado(r); byNorm.set(normalizeEstado(e), e) }
    const defaults = DEFAULT_ESTADOS.map(e => byNorm.get(normalizeEstado(e))).filter((e): e is string => !!e)
    if (defaults.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilters(prev => prev.estados.length > 0 ? prev : { ...prev, estados: defaults })
    }
     
    setDefaultEstadosApplied(true)
  }, [defaultEstadosApplied, loading, rows, filters.estados.length])

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

  const estadoKpis = useMemo(() => buildMiceEstadoKpiItems(filteredRows), [filteredRows])
  const maxTotal   = Math.max(1, ...responsableKpis.map(r => r.total))
  const active     = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  // Drill: clic en fila/celda navega a tab lista con filtros (usa nombres de campo de MiceFilters)
  const drillResponsable = (responsable: string) =>
    onDrillToList({ responsable: [responsable] })

  const drillCelda = (responsable: string, estado: string) =>
    onDrillToList({ responsable: [responsable], estado: [estado] })

  const drillEstado = (estado: string) =>
    onDrillToList({ estado: [estado] })

  return (
    <div className="w-full min-w-0 px-4 sm:px-5 lg:px-6 py-8 sm:py-10">

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Análisis MICE</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Carga por responsable y estado. Haz clic en cualquier celda para ir a la tabla filtrada.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)} disabled={!active}>
          Limpiar filtros
        </Button>
      </div>

      {error && <Alert variant="error" className="mb-5">{error}</Alert>}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm p-3 sm:p-4 mb-5">
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-3">
          <FilterSearchField
            label="Buscar"
            value={filters.busqueda}
            onChange={busqueda => setFilters({ ...filters, busqueda })}
            placeholder="MZP, cliente, evento..."
            className="col-span-2 lg:col-span-4"
          />
          <FilterMultiSelect
            label="Año"
            value={filters.anios}
            onChange={anios => setFilters({ ...filters, anios })}
            options={options.anios}
            className="lg:col-span-2"
          />
          <FilterMultiSelect
            label="Estado"
            value={filters.estados}
            onChange={estados => setFilters({ ...filters, estados })}
            options={options.estados}
            className="lg:col-span-3"
          />
          <FilterMultiSelect
            label="Responsable"
            value={filters.responsables}
            onChange={responsables => setFilters({ ...filters, responsables })}
            options={options.responsables}
            className="col-span-2 lg:col-span-3"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <MiceEstadoKpiBar
            items={estadoKpis}
            total={filteredRows.length}
            activeEstados={filters.estados}
            filteredView={active}
            onToggleEstado={nombre => {
              const only = filters.estados.length === 1 && filters.estados[0] === nombre
              setFilters({ ...filters, estados: only ? [] : [nombre] })
            }}
            onClearEstadoFilter={() => setFilters({ ...filters, estados: [] })}
          />

          {/* Matriz responsable × estado — full width */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Carga por responsable</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Haz clic en un responsable, estado o celda para filtrar la tabla de solicitudes
                </p>
              </div>
              <Badge variant="slate">{filteredRows.length} registros</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-190 text-xs">
                <thead>
                  <tr className="text-left border-b border-slate-100 dark:border-gray-800">
                    <th className="px-4 py-3 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 w-52">
                      Responsable
                    </th>
                    {estadoColumns.map(estado => (
                      <th key={estado} className="px-3 py-3 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 text-right">
                        <button
                          type="button"
                          onClick={() => drillEstado(estado)}
                          className="rounded-lg px-1.5 py-0.5 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                          title={`Ver solicitudes con estado "${estado}"`}
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
                    responsableKpis.map(stat => (
                      <tr
                        key={stat.responsable}
                        className="border-b border-slate-50 dark:border-gray-800/80 hover:bg-slate-50/60 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => drillResponsable(stat.responsable)}
                            className="w-full text-left group"
                            title={`Ver solicitudes de ${stat.responsable}`}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="font-semibold truncate text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                {stat.responsable}
                              </span>
                              <span className="shrink-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                                {filteredRows.length > 0 ? `${Math.round((stat.total / filteredRows.length) * 100)}%` : '0%'}
                              </span>
                            </span>
                            <span className="block mt-1 h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <span
                                className="block h-full rounded-full bg-indigo-500 group-hover:bg-indigo-600 transition-colors"
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
                                  onClick={() => drillCelda(stat.responsable, estado)}
                                  className="inline-flex min-w-8 justify-center rounded-lg px-2 py-1 font-semibold transition-colors text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                                  title={`Ver ${stat.responsable} / ${estado}`}
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
                            onClick={() => drillResponsable(stat.responsable)}
                            className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                            title={`Ver todas de ${stat.responsable}`}
                          >
                            {stat.total}
                          </button>
                        </td>
                      </tr>
                    ))
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
                            onClick={() => drillEstado(estado)}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {estadoTotals.get(estado) ?? 0}
                          </button>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{filteredRows.length}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Detalle inline: muestra las solicitudes de la selección */}
          {active && (
            <div className="mt-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {filteredRows.length} solicitud{filteredRows.length !== 1 ? 'es' : ''} con filtros aplicados
                </p>
                <button
                  type="button"
                  onClick={() => onDrillToList({})}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Ver en tabla completa →
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
                {filteredRows.slice(0, 20).map(row => (
                  <div key={row.id} className="px-4 py-3 flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{row.nombre}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{row.cliente} · {rowResponsable(row)}</p>
                    </div>
                    <Badge variant={estadoVariant(rowEstado(row))} className="shrink-0 text-[10px]">
                      {rowEstado(row)}
                    </Badge>
                  </div>
                ))}
                {filteredRows.length > 20 && (
                  <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">
                    {filteredRows.length - 20} más — usa "Ver en tabla completa" para verlas todas
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
