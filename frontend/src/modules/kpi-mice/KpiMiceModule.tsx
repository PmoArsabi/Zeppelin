import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import Alert from '@/components/ui/Alert'
import Badge, { type BadgeVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import PageTitle from '@/components/ui/PageTitle'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import FilterSearchField from '@/components/filters/FilterSearchField'
import { useAuth } from '@/context/AuthContext'
import { formatDateDDMMYYYY } from '@/lib/formatDate'
import type { NavigateFn } from '@/modules/types'
import MiceEstadoKpiBar, { buildMiceEstadoKpiItems } from '@/modules/solicitudes-mice/components/MiceEstadoKpiBar'
import { listSolicitudesMice } from '@/modules/solicitudes-mice/services/solicitudesMiceService'
import type { SolicitudMiceRow } from '@/modules/solicitudes-mice/types'

interface Props {
  onNavigate: NavigateFn
}

interface KpiFilters {
  anios: string[]
  estados: string[]
  responsables: string[]
  busqueda: string
}

interface DrillSelection {
  responsable: string
  estado?: string
}

interface ResponsableKpi {
  responsable: string
  total: number
  estados: Map<string, number>
  rows: SolicitudMiceRow[]
}

const EMPTY_FILTERS: KpiFilters = {
  anios: [],
  estados: [],
  responsables: [],
  busqueda: '',
}

const CURRENT_YEAR = String(new Date().getFullYear())
const DEFAULT_ESTADOS = ['Cotización enviada', 'En cierre', 'En cotización', 'En operación']

function normalizeEstadoName(estado: string): string {
  return estado.trim().toLowerCase()
}

const ESTADO_ORDER = [
  'Cotización enviada',
  'En cotización',
  'En cierre',
  'En operación',
]

function sortBySpanish(a: string, b: string): number {
  return a.localeCompare(b, 'es')
}

function sortEstados(estados: string[]): string[] {
  const order = new Map(ESTADO_ORDER.map((e, i) => [e.toLowerCase(), i]))
  return [...estados].sort((a, b) => {
    const ia = order.get(a.toLowerCase()) ?? 99
    const ib = order.get(b.toLowerCase()) ?? 99
    if (ia !== ib) return ia - ib
    return sortBySpanish(a, b)
  })
}

function rowResponsable(row: SolicitudMiceRow): string {
  return row.responsable_nombre?.trim() || 'Sin responsable'
}

function rowEstado(row: SolicitudMiceRow): string {
  return row.estado?.trim() || 'Sin estado'
}

function rowAnio(row: SolicitudMiceRow): string {
  return String(row.anio || row.fecha_solicitud?.slice(0, 4) || 'Sin año')
}

function money(value: number | null | undefined, currency: string | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency || 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function estadoVariant(estado: string): BadgeVariant {
  const n = estado.toLowerCase()
  if (n.includes('operación') || n.includes('operacion')) return 'emerald'
  if (n.includes('cierre')) return 'violet'
  if (n.includes('cotización') || n.includes('cotizacion')) return 'blue'
  if (n.includes('enviada')) return 'amber'
  return 'slate'
}

function matchesFilters(row: SolicitudMiceRow, filters: KpiFilters): boolean {
  if (filters.anios.length && !filters.anios.includes(rowAnio(row))) return false
  if (filters.estados.length && !filters.estados.includes(rowEstado(row))) return false
  if (filters.responsables.length && !filters.responsables.includes(rowResponsable(row))) return false

  const q = filters.busqueda.trim().toLowerCase()
  if (q) {
    const haystack = [
      row.mzp,
      row.nombre,
      row.cliente,
      rowResponsable(row),
      rowEstado(row),
      row.sector,
    ].join(' ').toLowerCase()
    if (!haystack.includes(q)) return false
  }

  return true
}

export default function KpiMiceModule({ onNavigate }: Props) {
  const { user, isAdmin } = useAuth()
  const [rows, setRows] = useState<SolicitudMiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<KpiFilters>(EMPTY_FILTERS)
  const [defaultYearApplied, setDefaultYearApplied] = useState(false)
  const [defaultEstadosApplied, setDefaultEstadosApplied] = useState(false)
  const [selection, setSelection] = useState<DrillSelection | null>(null)

  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
     
    setError(null)
    listSolicitudesMice().then(({ data, error: loadError }) => {
      if (loadError) setError(loadError)
      setRows(data ?? [])
      setLoading(false)
    })
  }, [user, isAdmin])

  const options = useMemo(() => {
    const anios = new Set<string>()
    const estados = new Set<string>()
    const responsables = new Set<string>()

    for (const row of rows) {
      anios.add(rowAnio(row))
      estados.add(rowEstado(row))
      responsables.add(rowResponsable(row))
    }

    return {
      anios: [...anios].sort((a, b) => Number(b) - Number(a)),
      estados: sortEstados([...estados]),
      responsables: [...responsables].sort(sortBySpanish),
    }
  }, [rows])

  const filteredRows = useMemo(
    () => rows.filter(row => matchesFilters(row, filters)),
    [rows, filters]
  )

  useEffect(() => {
    if (defaultYearApplied || loading || rows.length === 0 || filters.anios.length > 0) return
    const availableYears = new Set(rows.map(rowAnio))
    if (!availableYears.has(CURRENT_YEAR)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDefaultYearApplied(true)
      return
    }
     
    setFilters(prev => prev.anios.length > 0 ? prev : { ...prev, anios: [CURRENT_YEAR] })
     
    setDefaultYearApplied(true)
  }, [defaultYearApplied, loading, rows, filters.anios.length])

  useEffect(() => {
    if (defaultEstadosApplied || loading || rows.length === 0 || filters.estados.length > 0) return
    const estadoByNormalizedName = new Map<string, string>()
    for (const row of rows) {
      const estado = rowEstado(row)
      estadoByNormalizedName.set(normalizeEstadoName(estado), estado)
    }
    const defaults = DEFAULT_ESTADOS
      .map(estado => estadoByNormalizedName.get(normalizeEstadoName(estado)))
      .filter((estado): estado is string => Boolean(estado))
    if (defaults.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilters(prev => prev.estados.length > 0 ? prev : { ...prev, estados: defaults })
    }
     
    setDefaultEstadosApplied(true)
  }, [defaultEstadosApplied, loading, rows, filters.estados.length])

  const estadoColumns = useMemo(() => {
    const estados = new Set<string>()
    for (const row of filteredRows) estados.add(rowEstado(row))
    return sortEstados([...estados])
  }, [filteredRows])

  const responsableKpis = useMemo<ResponsableKpi[]>(() => {
    const map = new Map<string, ResponsableKpi>()
    for (const row of filteredRows) {
      const responsable = rowResponsable(row)
      const estado = rowEstado(row)
      const current = map.get(responsable) ?? {
        responsable,
        total: 0,
        estados: new Map<string, number>(),
        rows: [],
      }
      current.total += 1
      current.estados.set(estado, (current.estados.get(estado) ?? 0) + 1)
      current.rows.push(row)
      map.set(responsable, current)
    }
    return [...map.values()].sort((a, b) => b.total - a.total || sortBySpanish(a.responsable, b.responsable))
  }, [filteredRows])

  const estadoTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const row of filteredRows) totals.set(rowEstado(row), (totals.get(rowEstado(row)) ?? 0) + 1)
    return totals
  }, [filteredRows])

  const estadoKpis = useMemo(() => buildMiceEstadoKpiItems(filteredRows), [filteredRows])

  const detailRows = useMemo(() => {
    const base = selection
      ? filteredRows
      .filter(row => rowResponsable(row) === selection.responsable)
      .filter(row => !selection.estado || rowEstado(row) === selection.estado)
      : filteredRows

    return [...base].sort((a, b) => b.fecha_solicitud.localeCompare(a.fecha_solicitud))
  }, [filteredRows, selection])

  const maxResponsableTotal = Math.max(1, ...responsableKpis.map(r => r.total))
  const active = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)
  const activeResponsable = filters.responsables.length === 1 ? filters.responsables[0] : null
  const activeEstado = filters.estados.length === 1 ? filters.estados[0] : null

  const filterByResponsable = (responsable: string) => {
    const same = activeResponsable === responsable && !activeEstado
    setFilters(prev => ({ ...prev, responsables: same ? [] : [responsable] }))
    setSelection(same ? null : { responsable })
  }

  const filterByResponsableEstado = (responsable: string, estado: string) => {
    const same = activeResponsable === responsable && activeEstado === estado
    setFilters(prev => ({
      ...prev,
      responsables: same ? [] : [responsable],
      estados: same ? [] : [estado],
    }))
    setSelection(same ? null : { responsable, estado })
  }

  const filterByEstado = (estado: string) => {
    const same = activeEstado === estado && !activeResponsable
    setFilters(prev => ({ ...prev, estados: same ? [] : [estado] }))
    setSelection(null)
  }

  return (
    <AppShell activeModule="kpi-mice" onNavigate={onNavigate}>
      <div className="w-full min-w-0 px-4 sm:px-5 lg:px-6 py-8 sm:py-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div>
            <PageTitle>KPI MICE</PageTitle>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Analiza carga por responsable, estado y año. Haz clic en un responsable o en una celda para filtrar y ver detalle.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)} disabled={!active}>
            Limpiar filtros
          </Button>
        </div>

        {error && <Alert variant="error" className="mb-5">{error}</Alert>}

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

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <section className="xl:col-span-8 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Carga por responsable</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Matriz dinámica por estado</p>
                  </div>
                  <Badge variant="slate">{filteredRows.length} registros</Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-190 text-xs">
                    <thead>
                      <tr className="text-left border-b border-slate-100 dark:border-gray-800">
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Responsable</th>
                        {estadoColumns.map(estado => {
                          const estadoSelected = activeEstado === estado
                          const estadoDimmed = activeEstado !== null && !estadoSelected
                          return (
                            <th key={estado} className="px-3 py-3 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 text-right">
                              <button
                                type="button"
                                onClick={() => filterByEstado(estado)}
                                className={`rounded-lg px-1.5 py-0.5 transition-colors ${
                                  estadoSelected
                                    ? 'bg-indigo-600 text-white'
                                    : estadoDimmed
                                      ? 'opacity-40 hover:opacity-80 hover:text-indigo-600 dark:hover:text-indigo-400'
                                      : 'hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                                title={estadoSelected ? `Quitar filtro ${estado}` : `Filtrar por ${estado}`}
                              >
                                {estado}
                              </button>
                            </th>
                          )
                        })}
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {responsableKpis.length === 0 ? (
                        <tr>
                          <td colSpan={estadoColumns.length + 2} className="px-4 py-10 text-center text-slate-400">
                            Sin datos para los filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        responsableKpis.map(stat => {
                          const responsableSelected = activeResponsable === stat.responsable
                          const responsableDimmed = activeResponsable !== null && !responsableSelected
                          return (
                          <tr
                            key={stat.responsable}
                            className={`border-b border-slate-50 dark:border-gray-800/80 transition-colors ${
                              responsableSelected
                                ? 'bg-indigo-50/80 dark:bg-indigo-500/10'
                                : responsableDimmed
                                  ? 'opacity-45 hover:opacity-80 hover:bg-slate-50/80 dark:hover:bg-gray-800/40'
                                  : 'hover:bg-slate-50/80 dark:hover:bg-gray-800/40'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => filterByResponsable(stat.responsable)}
                                className="w-full text-left group"
                                title={responsableSelected && !activeEstado ? `Quitar filtro ${stat.responsable}` : `Filtrar por ${stat.responsable}`}
                              >
                                <span className="flex items-center justify-between gap-2">
                                  <span
                                    className={`font-semibold truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 ${
                                      responsableSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-100'
                                    }`}
                                  >
                                    {stat.responsable}
                                  </span>
                                  <span className="shrink-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                                    {filteredRows.length > 0 ? `${Math.round((stat.total / filteredRows.length) * 100)}%` : '0%'}
                                  </span>
                                </span>
                                <span className="block mt-1 h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <span
                                    className={`block h-full rounded-full transition-colors ${
                                      responsableSelected ? 'bg-indigo-700 dark:bg-indigo-300' : 'bg-indigo-500 group-hover:bg-indigo-600'
                                    }`}
                                    style={{ width: `${(stat.total / maxResponsableTotal) * 100}%` }}
                                  />
                                </span>
                              </button>
                            </td>
                            {estadoColumns.map(estado => {
                              const count = stat.estados.get(estado) ?? 0
                              const cellSelected = activeResponsable === stat.responsable && activeEstado === estado
                              const cellDimmed =
                                (activeResponsable !== null && activeResponsable !== stat.responsable) ||
                                (activeEstado !== null && activeEstado !== estado)
                              return (
                                <td key={estado} className={`px-3 py-3 text-right ${cellDimmed ? 'opacity-40' : ''}`}>
                                  {count > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => filterByResponsableEstado(stat.responsable, estado)}
                                      className={`inline-flex min-w-8 justify-center rounded-lg px-2 py-1 font-semibold transition-colors ${
                                        cellSelected
                                          ? 'bg-indigo-600 text-white shadow-sm'
                                          : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                                      }`}
                                      title={cellSelected ? `Quitar filtro ${stat.responsable} / ${estado}` : `Filtrar ${stat.responsable} / ${estado}`}
                                    >
                                      {count}
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600">—</span>
                                  )}
                                </td>
                              )
                            })}
                            <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                              <button
                                type="button"
                                onClick={() => filterByResponsable(stat.responsable)}
                                className="hover:text-indigo-600 dark:hover:text-indigo-400"
                                title={`Filtrar por ${stat.responsable}`}
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
                                onClick={() => filterByEstado(estado)}
                                className="hover:text-indigo-600 dark:hover:text-indigo-400"
                                title={`Filtrar por ${estado}`}
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
              </section>

              <aside className="xl:col-span-4 space-y-5">
                <section className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Detalle</h2>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {selection ? selection.responsable : 'Vista filtrada completa'}
                      </p>
                    </div>
                    {selection && (
                      <button
                        type="button"
                        onClick={() => setSelection(null)}
                        className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Cerrar
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-gray-800 max-h-130 overflow-y-auto">
                      {detailRows.map(row => (
                        <div key={row.id} className="p-4 hover:bg-slate-50 dark:hover:bg-gray-800/40">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-900 dark:text-white truncate" title={row.nombre}>
                                {row.nombre}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={row.cliente}>
                                {row.cliente}
                              </p>
                            </div>
                            <Badge variant={estadoVariant(rowEstado(row))} className="shrink-0">{rowEstado(row)}</Badge>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>MZP: <b className="text-slate-700 dark:text-slate-200">{row.mzp ?? '—'}</b></span>
                            <span>Fecha: <b className="text-slate-700 dark:text-slate-200">{formatDateDDMMYYYY(row.fecha_solicitud)}</b></span>
                            <span>Sector: <b className="text-slate-700 dark:text-slate-200">{row.sector ?? '—'}</b></span>
                            <span>Valor: <b className="text-slate-700 dark:text-slate-200">{money(row.valor_cotizado, row.moneda_cotizacion)}</b></span>
                          </div>
                        </div>
                      ))}
                      {detailRows.length === 0 && (
                        <div className="p-6 text-sm text-slate-400 dark:text-slate-500">Sin solicitudes para esta selección.</div>
                      )}
                    </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
