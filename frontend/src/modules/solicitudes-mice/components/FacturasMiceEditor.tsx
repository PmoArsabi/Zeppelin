import { useEffect, useState } from 'react'
import Switch from '@/components/ui/Switch'
import {
  facturaCorrespondeCliente,
  fetchFacturasAnticipo,
  type FacturaAnticipoEstado,
} from '../services/facturaAnticipoService'
import { FACTURA_REGEX, type FacturaMice } from '../types'
import FacturaDetalleModal from './FacturaDetalleModal'

interface Props {
  value: FacturaMice[]
  onChange: (facturas: FacturaMice[]) => void
  clienteId: number | null
  clienteNombre?: string
  readOnly?: boolean
  error?: string
  /** Valor final aprobado (sección En operación) para comparar contra el total facturado. */
  valorReferencia?: number | null
  /** Notifica si alguna factura verificada pertenece a un cliente distinto. */
  onClienteMismatchChange?: (hayMismatch: boolean) => void
  /** Notifica el total facturado verificado (null si aún no hay facturas verificadas). */
  onTotalFacturadoChange?: (total: number | null) => void
}

function formatValorFactura(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(valor)) return '—'
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor)
}

export default function FacturasMiceEditor({
  value,
  onChange,
  clienteId,
  clienteNombre,
  readOnly = false,
  error,
  valorReferencia = null,
  onClienteMismatchChange,
  onTotalFacturadoChange,
}: Props) {
  const [anticipoByFactura, setAnticipoByFactura] = useState<Map<string, FacturaAnticipoEstado>>(new Map())
  const [detalleAbierto, setDetalleAbierto] = useState<{ numero: string; estado: FacturaAnticipoEstado } | null>(null)

  const numerosValidos = value.map(f => f.numero.trim()).filter(n => FACTURA_REGEX.test(n))
  const numerosKey = numerosValidos.join(',')

  const hayClienteMismatch = numerosValidos.some(numero => {
    const estado = anticipoByFactura.get(numero)
    return estado !== undefined && estado.existe && !facturaCorrespondeCliente(estado, clienteId)
  })

  const numerosUnicos = Array.from(new Set(numerosValidos))
  const totalFacturado = numerosUnicos.reduce((acc, numero) => {
    const estado = anticipoByFactura.get(numero)
    return estado?.existe ? acc + (estado.totalConTa ?? 0) : acc
  }, 0)
  const hayTotal = numerosUnicos.some(numero => anticipoByFactura.get(numero)?.existe)
  const totalInsuficiente = hayTotal && valorReferencia != null && totalFacturado < valorReferencia

  useEffect(() => {
    onTotalFacturadoChange?.(hayTotal ? totalFacturado : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayTotal, totalFacturado])

  useEffect(() => {
    onClienteMismatchChange?.(hayClienteMismatch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayClienteMismatch])

  useEffect(() => {
    // Sin números válidos no hay nada que consultar; las entradas viejas del
    // mapa son inofensivas porque solo se consultan números presentes en value.
    if (numerosValidos.length === 0) return
    let cancelled = false
    fetchFacturasAnticipo(numerosValidos).then(({ data }) => {
      if (!cancelled) setAnticipoByFactura(data)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numerosKey])

  const updateNumero = (idx: number, numero: string) => {
    onChange(value.map((f, i) => (i === idx ? { ...f, numero: numero.toUpperCase() } : f)))
  }

  const updateRecibo = (idx: number, recibo: string) => {
    const r = recibo.toUpperCase()
    onChange(value.map((f, i) => (i === idx ? { ...f, recibo_caja_numero: r || null } : f)))
  }

  const updateAnticipo = (idx: number, anticipo: boolean) => {
    onChange(value.map((f, i) => (i === idx ? { ...f, anticipo } : f)))
  }

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  const addRow = () => {
    onChange([...value, { numero: '', recibo_caja_numero: null, anticipo: false }])
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-[11px] text-rose-500 dark:text-rose-400">{error}</p>
      )}

      {value.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
          {readOnly ? 'Sin facturas registradas.' : 'Agregue facturas y, opcionalmente, su recibo de caja.'}
        </p>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                <th className="text-left font-semibold uppercase tracking-wide px-2.5 py-1.5">Factura</th>
                <th className="text-left font-semibold uppercase tracking-wide px-2.5 py-1.5">Recibo de caja</th>
                <th className="text-right font-semibold uppercase tracking-wide px-2.5 py-1.5">Valor</th>
                <th className="text-left font-semibold uppercase tracking-wide px-2.5 py-1.5">¿Es Anticipo?</th>
                {!readOnly && <th className="w-8 px-2.5 py-1.5" />}
              </tr>
            </thead>
            <tbody>
              {value.map((f, idx) => {
                const numero = f.numero.trim()
                const esValida = FACTURA_REGEX.test(numero)
                const estado = esValida ? anticipoByFactura.get(numero) : undefined
                const noCorresponde = estado !== undefined
                  && estado.existe
                  && !facturaCorrespondeCliente(estado, clienteId)

                return (
                  <tr
                    key={idx}
                    className={`border-t ${
                      noCorresponde
                        ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/25'
                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
                    }`}
                  >
                    <td className="px-2.5 py-1.5">
                      {readOnly ? (
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {f.numero}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={f.numero}
                          onChange={e => updateNumero(idx, e.target.value)}
                          placeholder="Ej. ABCD1234"
                          className="w-full min-w-0 font-mono text-xs rounded border px-2 py-1
                                     bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                                     placeholder-slate-400 dark:placeholder-slate-500
                                     border-slate-200 dark:border-slate-700
                                     focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
                        />
                      )}
                      {noCorresponde && (
                        <p className="mt-1 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                          No corresponde a {clienteNombre || `cliente ${clienteId}`}.
                          {' '}Factura: {estado.codClientes.join(', ') || 'sin código'}
                        </p>
                      )}
                    </td>
                    <td className="px-2.5 py-1.5">
                      {readOnly ? (
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          {f.recibo_caja_numero ?? 'Sin recibo'}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={f.recibo_caja_numero ?? ''}
                          onChange={e => updateRecibo(idx, e.target.value)}
                          placeholder="Ej. AB1234"
                          className="w-full min-w-0 font-mono text-xs rounded border px-2 py-1
                                     bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                                     placeholder-slate-400 dark:placeholder-slate-500
                                     border-slate-200 dark:border-slate-700
                                     focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
                        />
                      )}
                    </td>
                    <td className="px-2.5 py-1.5">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap tabular-nums font-medium text-slate-700 dark:text-slate-300">
                        <span>
                          {esValida && estado !== undefined && estado.existe
                            ? formatValorFactura(estado.totalConTa)
                            : '—'}
                        </span>
                        {estado?.existe && estado.detalle.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setDetalleAbierto({ numero, estado })}
                            aria-label={`Ver detalle de factura ${numero}`}
                            title="Ver detalle de factura"
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                              <circle cx="12" cy="12" r="2.5" strokeWidth={2} />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2.5 py-1.5">
                      {!esValida ? (
                        <span className="text-slate-400 dark:text-slate-500 italic">Ingrese la factura</span>
                      ) : estado === undefined ? (
                        <span className="text-slate-400 dark:text-slate-500 italic">Verificando…</span>
                      ) : !estado.existe ? (
                        <span className="text-rose-500 dark:text-rose-400">No existe en informe acumulado</span>
                      ) : !estado.tieneLineaElegible ? (
                        <span className="text-rose-500 dark:text-rose-400">Sin productos de venta clasificados</span>
                      ) : readOnly || estado.anticipo ? (
                        <div>
                          <span
                            className={
                              f.anticipo
                                ? 'font-medium text-amber-600 dark:text-amber-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }
                          >
                            {f.anticipo ? 'Sí' : 'No'}
                          </span>
                          {estado.anticipo && !readOnly && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              Solo puede liberarse desde el módulo Facturas Excluidas.
                            </p>
                          )}
                        </div>
                      ) : (
                        <Switch
                          checked={f.anticipo}
                          onChange={v => updateAnticipo(idx, v)}
                          label={f.anticipo ? 'Sí' : 'No'}
                          color="amber"
                        />
                      )}
                    </td>
                    {!readOnly && (
                      <td className="px-2.5 py-1.5">
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          aria-label="Eliminar fila"
                          className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            {hayTotal && (
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                  <td colSpan={2} className="px-2.5 py-1.5 text-right font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Total facturado
                  </td>
                  <td
                    className={`px-2.5 py-1.5 text-right whitespace-nowrap tabular-nums font-semibold ${
                      totalInsuficiente
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-800 dark:text-white'
                    }`}
                  >
                    {formatValorFactura(totalFacturado)}
                  </td>
                  <td colSpan={readOnly ? 1 : 2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {totalInsuficiente && (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
          El total facturado ({formatValorFactura(totalFacturado)}) está por debajo del valor final aprobado ({formatValorFactura(valorReferencia)}).
        </p>
      )}

      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="text-xs font-medium px-3 py-1.5 rounded-lg
                     border border-dashed border-slate-300 dark:border-slate-600
                     text-slate-500 dark:text-slate-400
                     hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400
                     transition-colors"
        >
          + Agregar fila
        </button>
      )}

      {detalleAbierto && (
        <FacturaDetalleModal
          numero={detalleAbierto.numero}
          estado={detalleAbierto.estado}
          onClose={() => setDetalleAbierto(null)}
        />
      )}
    </div>
  )
}
