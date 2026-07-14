interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: 'indigo' | 'emerald' | 'rose'
  onConfirm: () => void
  onCancel: () => void
}

const confirmButtonClass: Record<NonNullable<ConfirmDialogProps['confirmColor']>, string> = {
  indigo: 'bg-indigo-600 hover:bg-indigo-500',
  emerald: 'bg-emerald-600 hover:bg-emerald-500',
  rose: 'bg-rose-600 hover:bg-rose-500',
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  confirmColor = 'indigo',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-100 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl px-6 py-5">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-2">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium px-4 py-2 rounded-lg
                       border border-slate-200 dark:border-slate-700
                       text-slate-600 dark:text-slate-300
                       hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`text-sm font-semibold px-4 py-2 rounded-lg text-white transition-colors ${confirmButtonClass[confirmColor]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
