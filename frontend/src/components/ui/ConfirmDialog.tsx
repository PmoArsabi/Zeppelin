import Button from './Button'

interface ConfirmDialogProps {
  variant: 'success' | 'error'
  title: string
  message: string
  onClose: () => void
}

const ICONS: Record<ConfirmDialogProps['variant'], React.ReactNode> = {
  success: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
}

const ICON_WRAPPER: Record<ConfirmDialogProps['variant'], string> = {
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  error: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
}

/** Modal bloqueante de confirmación — requiere que el usuario haga clic en "Aceptar" para cerrarlo. */
export default function ConfirmDialog({ variant, title, message, onClose }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-2xl p-6 text-center animate-fade-in">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${ICON_WRAPPER[variant]}`}>
          {ICONS[variant]}
        </div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1.5">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{message}</p>
        <Button onClick={onClose} className="w-full">Aceptar</Button>
      </div>
    </div>
  )
}
