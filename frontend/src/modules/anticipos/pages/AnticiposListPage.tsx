import { useEffect, useMemo, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import PageTitle from '@/components/ui/PageTitle'
import Alert from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { fetchAnticipos, liberarAnticipo, TIPOS_EXCLUSION, type AnticipoRow } from '../services/anticiposService'
import MarcarFacturaAnticipoModal from '../components/MarcarFacturaAnticipoModal'
import LiberarAnticipoDialog from '../components/LiberarAnticipoDialog'
import { exportarAnticiposExcel } from '../lib/exportarAnticiposExcel'

function fmtMoneda(v: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

function TwoLines({ top, bottom }: { top: React.ReactNode; bottom?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      {top !== null && (
        <p className="text-slate-700 dark:text-slate-300 truncate">{top ?? '—'}</p>
      )}
      {bottom && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate" title={typeof bottom === 'string' ? bottom : undefined}>
          {bottom}
        </p>
      )}
    </div>
  )
}

export default function AnticiposListPage() {
  const { displayName, user } = useAuth()
  const autor = displayName || user?.email || 'Usuario'
  const [rows, setRows] = useState<AnticipoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [oficinaFiltro, setOficinaFiltro] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [liberando, setLiberando] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [facturaAConfirmar, setFacturaAConfirmar] = useState<string | null>(null)

  const cargar = () => {
    setLoading(true)
    fetchAnticipos().then(({ data, error }) => {
      setRows(data)
      setError(error)
      setLoading(false)
    })
  }

  useEffect(() => {
    // Carga inicial sin setState síncrono: loading ya arranca en true.
    let cancelled = false
    fetchAnticipos().then(({ data, error }) => {
      if (cancelled) return
      setRows(data)
      setError(error)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const oficinas = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) {
      const oficina = r.nomofiventa?.trim()
      if (oficina) set.add(oficina)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'es'))
  }, [rows])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return rows.filter(r => {
      if (tipoFiltro && (r.tipo_exclusion ?? '') !== tipoFiltro) return false
      if (oficinaFiltro && (r.nomofiventa?.trim() ?? '') !== oficinaFiltro) return false
      // r.fecha viene como YYYY-MM-DD; la comparación de texto respeta el orden cronológico
      const fecha = (r.fecha ?? '').slice(0, 10)
      if (fechaDesde && (!fecha || fecha < fechaDesde)) return false
      if (fechaHasta && (!fecha || fecha > fechaHasta)) return false
      if (!q) return true
      return (
        r.factura.toLowerCase().includes(q) ||
        (r.mzp ?? '').toLowerCase().includes(q) ||
        (r.nomcliente ?? '').toLowerCase().includes(q) ||
        (r.nompasajeros ?? '').toLowerCase().includes(q) ||
        (r.producto ?? '').toLowerCase().includes(q)
      )
    })
  }, [rows, busqueda, tipoFiltro, oficinaFiltro, fechaDesde, fechaHasta])

  const totalGeneral = useMemo(() => filtradas.reduce((acc, r) => acc + (r.total_con_impuestos ?? 0), 0), [filtradas])
  const facturasUnicas = useMemo(() => new Set(filtradas.map(r => r.factura)).size, [filtradas])

  const handleLiberar = async (factura: string, observacion: string) => {
    setLiberando(factura)
    const { error } = await liberarAnticipo(factura, autor, observacion)
    setLiberando(null)

    if (error) {
      setError(error)
      return
    }
    setFacturaAConfirmar(null)
    setRows(prev => prev.filter(r => r.factura !== factura))
  }

  return (
    <div className="max-w-350 mx-auto p-6 space-y-6">
      <PageTitle>Facturas Excluidas</PageTitle>

      <Card>
        <CardHeader
          title="Facturas marcadas como anticipo y/o excluidas por negociación"
          description="Facturas en estado PREFACTURA o FACTURADA excluidas de ventas reales."
        />
        <CardBody>
          {error && (
            <Alert variant="error" className="mb-4">{error}</Alert>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por factura, MZP, cliente, pasajero o producto…"
              className="flex-1 min-w-60 max-w-100 text-sm rounded-lg border px-3 py-2
                         bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                         placeholder-slate-400 dark:placeholder-slate-500
                         border-slate-200 dark:border-slate-700
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
            />
            <select
              value={tipoFiltro}
              onChange={e => setTipoFiltro(e.target.value)}
              aria-label="Filtrar por tipo de exclusión"
              className="text-sm rounded-lg border px-3 py-2
                         bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                         border-slate-200 dark:border-slate-700
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
            >
              <option value="">Todos los tipos</option>
              {TIPOS_EXCLUSION.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={oficinaFiltro}
              onChange={e => setOficinaFiltro(e.target.value)}
              aria-label="Filtrar por oficina de venta"
              className="max-w-55 text-sm rounded-lg border px-3 py-2
                         bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                         border-slate-200 dark:border-slate-700
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
            >
              <option value="">Todas las oficinas</option>
              {oficinas.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                aria-label="Fecha desde"
                title="Fecha desde"
                className="text-sm rounded-lg border px-3 py-2
                           bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                           border-slate-200 dark:border-slate-700
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">a</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                aria-label="Fecha hasta"
                title="Fecha hasta"
                className="text-sm rounded-lg border px-3 py-2
                           bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                           border-slate-200 dark:border-slate-700
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="text-sm font-semibold uppercase tracking-wide px-4 py-2 rounded-lg
                         bg-amber-500 text-white hover:bg-amber-400 transition-colors whitespace-nowrap"
            >
              Factura
            </button>
            <button
              type="button"
              onClick={() => exportarAnticiposExcel(filtradas)}
              disabled={filtradas.length === 0}
              className="text-sm font-semibold uppercase tracking-wide px-4 py-2 rounded-lg
                         border border-emerald-300 dark:border-emerald-700
                         text-emerald-700 dark:text-emerald-400
                         hover:bg-emerald-50 dark:hover:bg-emerald-900/30
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors whitespace-nowrap"
            >
              Exportar a Excel
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic py-6 text-center">
              No hay facturas de anticipo registradas.
            </p>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <table className="w-full text-xs min-w-200">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-3 py-2.5">
                      Factura / Producto
                    </th>
                    <th className="text-left font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-3 py-2.5">
                      MZP
                    </th>
                    <th className="text-left font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-3 py-2.5">
                      Fecha / Oficina
                    </th>
                    <th className="text-left font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-3 py-2.5">
                      Cliente / Evento
                    </th>
                    <th className="text-left font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-3 py-2.5">
                      Observación / Ítem
                    </th>
                    <th className="text-left font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-3 py-2.5">
                      Tipo
                    </th>
                    <th className="text-right font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-3 py-2.5 whitespace-nowrap">
                      Total c/impuestos
                    </th>
                    <th className="px-3 py-2.5 w-25" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtradas.map((r, idx) => {
                    const esPrimeraDelGrupo = idx === 0 || filtradas[idx - 1].factura !== r.factura
                    return (
                      <tr
                        key={`${r.factura}-${idx}`}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors align-top ${
                          esPrimeraDelGrupo ? 'border-t-2 border-t-slate-300 dark:border-t-slate-600' : ''
                        }`}
                      >
                        <td className="px-3 py-2.5 max-w-40">
                          <TwoLines
                            top={esPrimeraDelGrupo ? <span className="font-mono font-semibold">{r.factura}</span> : null}
                            bottom={r.producto}
                          />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {esPrimeraDelGrupo ? (
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                              {r.mzp?.trim() || '—'}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <TwoLines top={r.fecha} bottom={r.nomofiventa} />
                        </td>
                        <td className="px-3 py-2.5 max-w-55">
                          <TwoLines top={r.nomcliente} bottom={r.nompasajeros} />
                        </td>
                        <td className="px-3 py-2.5 max-w-55">
                          <TwoLines top={r.observacion_fact} bottom={r.descripcion_item} />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {r.tipo_exclusion ? (
                            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full
                                             bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                              {TIPOS_EXCLUSION.find(t => t.value === r.tipo_exclusion)?.label ?? r.tipo_exclusion}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                          {fmtMoneda(r.total_con_impuestos)}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          {esPrimeraDelGrupo && (
                            <button
                              type="button"
                              onClick={() => setFacturaAConfirmar(r.factura)}
                              disabled={liberando === r.factura}
                              className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md
                                         border border-emerald-300 dark:border-emerald-700
                                         text-emerald-700 dark:text-emerald-400
                                         hover:bg-emerald-50 dark:hover:bg-emerald-900/30
                                         disabled:opacity-50 disabled:cursor-not-allowed
                                         transition-colors"
                            >
                              {liberando === r.factura ? 'Liberando…' : 'Liberar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtradas.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs px-1">
              <span className="text-slate-500 dark:text-slate-400">
                {facturasUnicas} factura{facturasUnicas === 1 ? '' : 's'} ({filtradas.length} línea{filtradas.length === 1 ? '' : 's'})
              </span>
              <span className="font-semibold text-slate-800 dark:text-white">
                Total: {fmtMoneda(totalGeneral)}
              </span>
            </div>
          )}
        </CardBody>
      </Card>

      {modalAbierto && (
        <MarcarFacturaAnticipoModal
          onClose={() => setModalAbierto(false)}
          onMarcada={cargar}
        />
      )}

      {facturaAConfirmar && (
        <LiberarAnticipoDialog
          factura={facturaAConfirmar}
          busy={liberando === facturaAConfirmar}
          onConfirm={observacion => handleLiberar(facturaAConfirmar, observacion)}
          onCancel={() => setFacturaAConfirmar(null)}
        />
      )}
    </div>
  )
}
