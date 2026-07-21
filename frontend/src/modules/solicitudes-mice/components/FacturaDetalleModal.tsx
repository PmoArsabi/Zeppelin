import { formatDateDDMMYYYY } from '@/lib/formatDate'
import type { FacturaAnticipoEstado } from '../services/facturaAnticipoService'

interface Props {
  numero: string
  estado: FacturaAnticipoEstado
  onClose: () => void
}

function formatValor(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor)
}

export default function FacturaDetalleModal({ numero, estado, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="factura-detalle-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 id="factura-detalle-title" className="text-sm font-semibold text-slate-900 dark:text-white">
              Detalle de factura {numero}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {estado.detalle.length} ítem{estado.detalle.length === 1 ? '' : 's'} · Total {formatValor(estado.totalConTa ?? 0)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-180 text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide">Código cliente</th>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide">Cliente</th>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide">Producto</th>
                <th className="px-4 py-2 text-right font-semibold uppercase tracking-wide">Valor</th>
              </tr>
            </thead>
            <tbody>
              {estado.detalle.map((item, index) => (
                <tr key={`${item.factura}-${index}`} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">
                    {formatDateDDMMYYYY(item.fecha)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-slate-600 dark:text-slate-300">
                    {item.codcliente ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{item.nomcliente ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{item.producto ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums text-slate-800 dark:text-white">
                    {formatValor(item.totalConTa)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
