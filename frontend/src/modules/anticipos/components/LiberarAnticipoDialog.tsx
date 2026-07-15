import { useState } from 'react'

interface Props {
  factura: string
  busy: boolean
  onConfirm: (observacion: string) => void
  onCancel: () => void
}

export default function LiberarAnticipoDialog({ factura, busy, onConfirm, onCancel }: Props) {
  const [observacion, setObservacion] = useState('')
  const vacio = !observacion.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-110 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl px-6 py-5">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-2">Liberar factura</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          ¿Liberar la factura <span className="font-mono font-medium">{factura}</span>? Dejará de estar marcada
          como anticipo y volverá a contar como venta real. Indica el motivo:
        </p>

        <textarea
          value={observacion}
          onChange={e => setObservacion(e.target.value)}
          placeholder="Ej. Servicio completado, factura confirmada…"
          rows={3}
          autoFocus
          className="w-full text-sm rounded-lg border px-3 py-2 resize-none
                     bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                     placeholder-slate-400 dark:placeholder-slate-500
                     border-slate-200 dark:border-slate-700
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
        />

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-sm font-medium px-4 py-2 rounded-lg
                       border border-slate-200 dark:border-slate-700
                       text-slate-600 dark:text-slate-300
                       hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(observacion.trim())}
            disabled={busy || vacio}
            className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-colors
                       bg-emerald-600 hover:bg-emerald-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Liberando…' : 'Liberar'}
          </button>
        </div>
      </div>
    </div>
  )
}
