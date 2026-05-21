import { useCallback, useEffect, useState } from 'react'
import Alert from '@/components/ui/Alert'
import { parseLineasObservacion, type TipoCambioAuditoria } from '@/lib/auditoria/buildObservacion'
import { listLogAuditoria } from '@/lib/auditoria/logAuditoriaService'
import { MODULO_AUDITORIA_LABELS, type ModuloAuditoria } from '@/lib/auditoria/types'

interface Props {
  modulo: ModuloAuditoria
  idRegistro: string | null
}

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ESTILO_LINEA: Record<TipoCambioAuditoria, string> = {
  agregado:
    'text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-500/25',
  eliminado:
    'text-rose-700 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-500/10 border-rose-200/80 dark:border-rose-500/25',
  modificado: 'text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-600/50',
}

const ETIQUETA_TIPO: Record<TipoCambioAuditoria, string> = {
  agregado: 'Agregado',
  eliminado: 'Eliminado',
  modificado: 'Actualización',
}

function ObservacionLineas({ observacion }: { observacion: string }) {
  const lineas = parseLineasObservacion(observacion)
  return (
    <ul className="space-y-1.5">
      {lineas.map((linea, i) => (
        <li
          key={i}
          className={`text-xs rounded-lg px-2.5 py-1.5 border ${ESTILO_LINEA[linea.tipo]}`}
        >
          <span className="font-semibold text-[10px] uppercase tracking-wide opacity-80 mr-2">
            {ETIQUETA_TIPO[linea.tipo]}
          </span>
          {linea.texto}
        </li>
      ))}
    </ul>
  )
}

export default function AuditoriaPanel({ modulo, idRegistro }: Props) {
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof listLogAuditoria>>['data']>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!idRegistro) {
      setEntries([])
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await listLogAuditoria(modulo, idRegistro)
    if (err) setError(err)
    else setEntries(data)
    setLoading(false)
  }, [modulo, idRegistro])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al cambiar registro
    void load()
  }, [load])

  if (!idRegistro) return null

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-slate-500 dark:text-slate-400">
        Módulo: {MODULO_AUDITORIA_LABELS[modulo]}
      </p>
      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Agregado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Eliminado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-400" /> Actualización
        </span>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {loading && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Cargando historial de cambios...</p>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sin registros de auditoría. Al guardar cambios en edición se registrarán aquí.
        </p>
      )}
      {!loading && entries.length > 0 && (
        <ul className="space-y-3">
          {entries.map(entry => (
            <li
              key={entry.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 px-3.5 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {formatFechaHora(entry.fecha_actualizacion)}
                </span>
                {entry.autor_nombre && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                    {entry.autor_nombre}
                  </span>
                )}
              </div>
              <ObservacionLineas observacion={entry.observacion} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
