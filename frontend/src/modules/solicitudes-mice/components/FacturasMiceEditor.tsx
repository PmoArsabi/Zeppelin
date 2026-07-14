import { useEffect, useState } from 'react'
import Switch from '@/components/ui/Switch'
import { fetchFacturasAnticipo, type FacturaAnticipoEstado } from '../services/facturaAnticipoService'
import { FACTURA_REGEX, type FacturaMice } from '../types'

interface Props {
  value: FacturaMice[]
  onChange: (facturas: FacturaMice[]) => void
  readOnly?: boolean
  error?: string
}

export default function FacturasMiceEditor({ value, onChange, readOnly = false, error }: Props) {
  const [anticipoByFactura, setAnticipoByFactura] = useState<Map<string, FacturaAnticipoEstado>>(new Map())

  const numerosValidos = value.map(f => f.numero.trim()).filter(n => FACTURA_REGEX.test(n))
  const numerosKey = numerosValidos.join(',')

  useEffect(() => {
    if (numerosValidos.length === 0) {
      setAnticipoByFactura(new Map())
      return
    }
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
                <th className="text-left font-semibold uppercase tracking-wide px-2.5 py-1.5">¿Es Anticipo?</th>
                {!readOnly && <th className="w-8 px-2.5 py-1.5" />}
              </tr>
            </thead>
            <tbody>
              {value.map((f, idx) => {
                const numero = f.numero.trim()
                const esValida = FACTURA_REGEX.test(numero)
                const estado = esValida ? anticipoByFactura.get(numero) : undefined

                return (
                  <tr
                    key={idx}
                    className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
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
                      {!esValida ? (
                        <span className="text-slate-400 dark:text-slate-500 italic">Ingrese la factura</span>
                      ) : estado === undefined ? (
                        <span className="text-slate-400 dark:text-slate-500 italic">Verificando…</span>
                      ) : !estado.existe ? (
                        <span className="text-rose-500 dark:text-rose-400">No existe en informe acumulado</span>
                      ) : !estado.tieneLineaElegible ? (
                        <span className="text-rose-500 dark:text-rose-400">Sin productos de venta clasificados</span>
                      ) : readOnly ? (
                        <span
                          className={
                            f.anticipo
                              ? 'font-medium text-amber-600 dark:text-amber-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }
                        >
                          {f.anticipo ? 'Sí' : 'No'}
                        </span>
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
          </table>
        </div>
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
    </div>
  )
}
