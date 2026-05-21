import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import type { SeguimientoMiceEntry } from '../types/seguimiento-mice'
import { addSeguimientoMice, listSeguimientosMice } from '../services/seguimientoMiceService'

const MAX_LEN = 2000

interface Props {
  solicitudId: string | null
  currentUserId: string
  autorNombre: string
  /** Mensaje pendiente al crear cotización (aún sin id) */
  pendingMessage?: string
  onPendingMessageChange?: (text: string) => void
  readOnly?: boolean
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso)
  const today = startOfDay(new Date())
  const day = startOfDay(d)
  const diff = Math.round((today - day) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  return d.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

type TimelineItem =
  | { type: 'day'; key: string; label: string }
  | { type: 'msg'; key: string; entry: SeguimientoMiceEntry }

function buildTimeline(entries: SeguimientoMiceEntry[]): TimelineItem[] {
  const items: TimelineItem[] = []
  let lastDay = ''
  for (const entry of entries) {
    const dayKey = entry.created_at.slice(0, 10)
    if (dayKey !== lastDay) {
      lastDay = dayKey
      items.push({ type: 'day', key: `day-${dayKey}`, label: formatDayLabel(entry.created_at) })
    }
    items.push({ type: 'msg', key: entry.id, entry })
  }
  return items
}

export default function SeguimientoMiceChat({
  solicitudId,
  currentUserId,
  autorNombre,
  pendingMessage = '',
  onPendingMessageChange,
  readOnly = false,
}: Props) {
  const [entries, setEntries] = useState<SeguimientoMiceEntry[]>([])
  const [localDraft, setLocalDraft] = useState('')
  const draft = onPendingMessageChange ? pendingMessage : localDraft
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const isNew = solicitudId == null

  const syncDraft = (text: string) => {
    if (onPendingMessageChange) onPendingMessageChange(text)
    else setLocalDraft(text)
  }

  const load = useCallback(async () => {
    if (!solicitudId) {
      setEntries([])
      setLoadFailed(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    setLoadFailed(false)
    const { data, error: err } = await listSeguimientosMice(solicitudId)
    if (err) {
      setError(err)
      setLoadFailed(true)
      setEntries([])
    } else {
      setEntries(data)
    }
    setLoading(false)
  }, [solicitudId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al cambiar solicitud
    void load()
  }, [load])

  const timeline = useMemo(() => buildTimeline(entries), [entries])

  const handleSend = async () => {
    const text = draft.trim()
    if (!text) {
      setError('Escriba un mensaje.')
      return
    }
    if (text.length > MAX_LEN) {
      setError('Máximo 2000 caracteres.')
      return
    }

    if (isNew) {
      setError(null)
      return
    }

    setSending(true)
    setError(null)
    const { data, error: err } = await addSeguimientoMice(
      solicitudId!,
      currentUserId,
      autorNombre,
      text
    )
    setSending(false)
    if (err) {
      setError(err)
      return
    }
    if (data) {
      setEntries(prev => [...prev, data])
      syncDraft('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
      <div
        className="px-4 py-4 space-y-3"
        aria-live="polite"
        aria-label="Historial de seguimientos"
      >
        {loading && (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-8">Cargando historial...</p>
        )}

        {!loading && isNew && entries.length === 0 && (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-6 px-2">
            Al registrar la cotización podrá guardar el primer seguimiento. Los siguientes se agregan aquí con fecha y autor, como un chat.
          </p>
        )}

        {!loading && loadFailed && (
          <div className="text-center py-6 px-2 space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              No se pudo cargar el historial de seguimientos.
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
              Reintentar
            </Button>
          </div>
        )}

        {!loading && !loadFailed && !isNew && entries.length === 0 && (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-6">
            Sin seguimientos aún. Escriba abajo el primero.
          </p>
        )}

        {timeline.map(item => {
          if (item.type === 'day') {
            return (
              <div key={item.key} className="flex justify-center py-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400
                                 bg-white/80 dark:bg-slate-900/60 px-3 py-1 rounded-full border border-slate-200/80 dark:border-slate-700">
                  {item.label}
                </span>
              </div>
            )
          }

          const { entry } = item
          const isOwn = entry.user_id === currentUserId
          return (
            <div
              key={item.key}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                  isOwn
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-bl-md'
                }`}
              >
                {!isOwn && (
                  <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">
                    {entry.autor_nombre}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{entry.mensaje}</p>
                <p
                  className={`text-[10px] mt-1 text-right ${
                    isOwn ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {formatTime(entry.created_at)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="px-3 pb-2">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {!readOnly && (
      <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={draft}
            onChange={e => {
              syncDraft(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={MAX_LEN}
            placeholder={
              isNew
                ? 'Primer seguimiento (opcional, se guarda al registrar)...'
                : 'Escriba un seguimiento... Enter para enviar, Shift+Enter nueva línea'
            }
            className="flex-1 min-h-[2.75rem] max-h-32 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                       bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white resize-y
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
          />
          <Button
            type="button"
            size="md"
            loading={sending}
            disabled={!draft.trim() || sending || loadFailed}
            onClick={() => void handleSend()}
            className="shrink-0"
            aria-label="Enviar seguimiento"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 text-right">
          {draft.length}/{MAX_LEN}
          {isNew && draft.trim() ? ' · Se guardará al registrar la cotización' : ''}
        </p>
      </div>
      )}
    </div>
  )
}
