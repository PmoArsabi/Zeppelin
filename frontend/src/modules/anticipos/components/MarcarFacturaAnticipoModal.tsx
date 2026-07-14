import { useState } from 'react'
import Alert from '@/components/ui/Alert'
import { buscarFactura, marcarAnticipo, type FacturaBusquedaResult } from '../services/anticiposService'

interface Props {
  onClose: () => void
  onMarcada: () => void
}

function fmtMoneda(v: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

export default function MarcarFacturaAnticipoModal({ onClose, onMarcada }: Props) {
  const [texto, setTexto] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<FacturaBusquedaResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [marcando, setMarcando] = useState<string | null>(null)

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = texto.trim()
    if (!q) return

    setBuscando(true)
    setError(null)
    const { data, error } = await buscarFactura(q)
    setBuscando(false)

    if (error) {
      setError(error)
      setResultados(null)
      return
    }
    setResultados(data)
  }

  const handleMarcar = async (factura: string) => {
    setMarcando(factura)
    setError(null)
    const { error } = await marcarAnticipo(factura)
    setMarcando(null)

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
          <h2 className="text-sm font-semibold text-orange-500 dark:text-orange-400">Buscar factura para marcar anticipo</h2>
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
              placeholder="Ej. FEGZ913"
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
                No se encontraron facturas que empiecen por "{texto.trim()}".
              </p>
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 max-h-100 overflow-y-auto">
                {resultados.map(r => (
                  <div key={r.factura} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{r.factura}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {r.nomcliente ?? '—'} · {r.fecha ?? '—'} · {fmtMoneda(r.totalConImpuestos)}
                      </p>
                    </div>

                    {r.anticipo ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        Ya es anticipo
                      </span>
                    ) : !r.tieneLineaElegible ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-500 dark:text-rose-400 whitespace-nowrap">
                        Sin productos de venta clasificados
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarcar(r.factura)}
                        disabled={marcando === r.factura}
                        className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md shrink-0
                                   border border-amber-300 dark:border-amber-700
                                   text-amber-700 dark:text-amber-400
                                   hover:bg-amber-50 dark:hover:bg-amber-900/30
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   transition-colors"
                      >
                        {marcando === r.factura ? 'Marcando…' : 'Marcar anticipo'}
                      </button>
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
