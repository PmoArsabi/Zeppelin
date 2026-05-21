import Button from '@/components/ui/Button'

export type SaveFeedbackStatus = 'saving' | 'success' | 'error'

export interface SaveFeedbackState {
  status: SaveFeedbackStatus
  title: string
  detail?: string
}

interface Props {
  feedback: SaveFeedbackState | null
  onDismiss?: () => void
}

export default function SaveFeedbackOverlay({ feedback, onDismiss }: Props) {
  if (!feedback) return null

  const { status, title, detail } = feedback

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-busy={status === 'saving'}
      aria-labelledby="save-feedback-title"
    >
      <div
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl px-6 py-6 text-center"
        onClick={e => e.stopPropagation()}
      >
        {status === 'saving' && (
          <div className="mx-auto mb-4 w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        )}
        {status === 'success' && (
          <div className="mx-auto mb-4 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {status === 'error' && (
          <div className="mx-auto mb-4 w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}

        <h2 id="save-feedback-title" className="text-base font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>
        {detail && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 break-words">{detail}</p>
        )}
        {status === 'saving' && (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            No cierre ni modifique el formulario hasta finalizar.
          </p>
        )}
        {status === 'success' && (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Redirigiendo al listado...</p>
        )}
        {status === 'error' && onDismiss && (
          <Button type="button" className="mt-5 w-full" onClick={onDismiss}>
            Entendido
          </Button>
        )}
      </div>
    </div>
  )
}
