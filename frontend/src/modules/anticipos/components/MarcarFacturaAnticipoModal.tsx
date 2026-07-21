import { useState } from 'react'
import Alert from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { formatDateDDMMYYYY } from '@/lib/formatDate'
import {
  buscarFactura,
  excluirFactura,
  TIPOS_EXCLUSION,
  type FacturaBusquedaResult,
  type TipoExclusion,
} from '../services/anticiposService'
import { fetchFacturasAnticipo, type FacturaAnticipoEstado } from '@/modules/solicitudes-mice/services/facturaAnticipoService'

interface Props {
  onClose: () => void
  onMarcada: () => void
}

function formatValor(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor)
}

export default function MarcarFacturaAnticipoModal({ onClose, onMarcada }: Props) {
  const { displayName, user } = useAuth()
  const autor = displayName || user?.email || 'Usuario'
  const [texto, setTexto] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<FacturaBusquedaResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [excluyendo, setExcluyendo] = useState(false)

  /** Factura seleccionada para excluir (abre el formulario de tipo + observación) */
  const [seleccionada, setSeleccionada] = useState<string | null>(null)
  const [tipo, setTipo] = useState<TipoExclusion>('anticipo')
  const [observacion, setObservacion] = useState('')
  const [detalleByFactura, setDetalleByFactura] = useState<Map<string, FacturaAnticipoEstado>>(new Map())

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = texto.trim()
    if (!q) return

    setBuscando(true)
    setError(null)
    setSeleccionada(null)
    const { data, error } = await buscarFactura(q)

    if (error) {
      setBuscando(false)
      setError(error)
      setResultados(null)
      setDetalleByFactura(new Map())
      return
    }

    const numeros = data.map(resultado => resultado.factura)
    const detalleRes = await fetchFacturasAnticipo(numeros)
    setBuscando(false)
    if (detalleRes.error) {
      setError(detalleRes.error)
      setResultados(null)
      setDetalleByFactura(new Map())
      return
    }

    setResultados(data)
    setDetalleByFactura(detalleRes.data)
  }

  const handleExcluir = async () => {
    if (!seleccionada) return
    setExcluyendo(true)
    setError(null)
    const { error } = await excluirFactura(seleccionada, tipo, autor, observacion.trim())
    setExcluyendo(false)

    if (error) {
      setError(error)
      return
    }
    onMarcada()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-160 my-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-orange-500 dark:text-orange-400">Buscar factura para excluir</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <form onSubmit={handleBuscar} className="flex gap-2">
            <input
              type="text"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Ej. FEGZ913 (número exacto)"
              autoFocus
              className="flex-1 font-mono text-sm rounded-lg border px-3 py-2
                         bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                         placeholder-slate-400 dark:placeholder-slate-500
                         border-slate-200 dark:border-slate-700
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
            />
            <button
              type="submit"
              disabled={buscando || !texto.trim()}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white
                         hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          </form>

          {error && <Alert variant="error">{error}</Alert>}

          {resultados !== null && (
            resultados.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-4">
                No se encontró la factura "{texto.trim()}".
              </p>
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 max-h-100 overflow-y-auto">
                {resultados.map(r => (
                  <div key={r.factura} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{r.factura}</p>

                      {r.anticipo ? (
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          Ya está excluida{r.tipo_exclusion ? ` (${r.tipo_exclusion})` : ''}
                        </span>
                      ) : !r.tiene_linea_elegible ? (
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-500 dark:text-rose-400 whitespace-nowrap">
                          Sin productos de venta clasificados
                        </span>
                      ) : seleccionada === r.factura ? (
                        <button
                          type="button"
                          onClick={() => setSeleccionada(null)}
                          className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md shrink-0
                                     border border-slate-300 dark:border-slate-600
                                     text-slate-500 dark:text-slate-400
                                     hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSeleccionada(r.factura)
                            setTipo('anticipo')
                            setObservacion('')
                          }}
                          className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md shrink-0
                                     border border-amber-300 dark:border-amber-700
                                     text-amber-700 dark:text-amber-400
                                     hover:bg-amber-50 dark:hover:bg-amber-900/30
                                     transition-colors"
                        >
                          Excluir
                        </button>
                      )}
                    </div>

                    {(() => {
                      const estado = detalleByFactura.get(r.factura.toUpperCase().trim())
                      if (!estado || estado.detalle.length === 0) return null
                      return (
                        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                          <table className="w-full min-w-140 text-[11px]">
                            <thead className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <tr>
                                <th className="px-2.5 py-1.5 text-left font-semibold uppercase tracking-wide">Fecha</th>
                                <th className="px-2.5 py-1.5 text-left font-semibold uppercase tracking-wide">Código cliente</th>
                                <th className="px-2.5 py-1.5 text-left font-semibold uppercase tracking-wide">Cliente</th>
                                <th className="px-2.5 py-1.5 text-left font-semibold uppercase tracking-wide">Producto</th>
                                <th className="px-2.5 py-1.5 text-right font-semibold uppercase tracking-wide">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {estado.detalle.map((item, index) => (
                                <tr key={`${item.factura}-${index}`} className="border-t border-slate-100 dark:border-slate-800">
                                  <td className="whitespace-nowrap px-2.5 py-1.5 text-slate-600 dark:text-slate-300">
                                    {formatDateDDMMYYYY(item.fecha)}
                                  </td>
                                  <td className="whitespace-nowrap px-2.5 py-1.5 font-mono text-slate-600 dark:text-slate-300">
                                    {item.codcliente ?? '—'}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-700 dark:text-slate-200">{item.nomcliente ?? '—'}</td>
                                  <td className="px-2.5 py-1.5 text-slate-700 dark:text-slate-200">{item.producto ?? '—'}</td>
                                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right font-medium tabular-nums text-slate-800 dark:text-white">
                                    {formatValor(item.totalConTa)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                                <td colSpan={4} className="px-2.5 py-1.5 text-right font-semibold uppercase text-slate-500 dark:text-slate-400">
                                  Total
                                </td>
                                <td className="whitespace-nowrap px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-800 dark:text-white">
                                  {formatValor(estado.totalConTa ?? 0)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )
                    })()}

                    {seleccionada === r.factura && (
                      <div className="mt-3 space-y-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                            Tipo de exclusión
                          </label>
                          <select
                            value={tipo}
                            onChange={e => setTipo(e.target.value as TipoExclusion)}
                            className="w-full text-sm rounded-lg border px-3 py-2
                                       bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                                       border-slate-200 dark:border-slate-700
                                       focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
                          >
                            {TIPOS_EXCLUSION.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                            Observación
                          </label>
                          <textarea
                            value={observacion}
                            onChange={e => setObservacion(e.target.value)}
                            rows={2}
                            placeholder="Ej. Anticipo del evento X, acuerdo comercial…"
                            className="w-full text-sm rounded-lg border px-3 py-2 resize-none
                                       bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                                       placeholder-slate-400 dark:placeholder-slate-500
                                       border-slate-200 dark:border-slate-700
                                       focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleExcluir}
                            disabled={excluyendo || !observacion.trim()}
                            className="text-sm font-semibold px-4 py-2 rounded-lg bg-amber-500 text-white
                                       hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {excluyendo ? 'Excluyendo…' : 'Confirmar exclusión'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
