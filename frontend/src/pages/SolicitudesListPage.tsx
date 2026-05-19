import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/layout/AppShell'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import type { BadgeVariant } from '../components/ui/Badge'
import type { EstadoSolicitud } from '../types/solicitud'

interface Solicitud {
  id: string
  created_at: string
  fecha: string
  localizador: string
  cliente: string
  asesor: string
  ciudad: string | null
  tiquetes: boolean
  hoteles: boolean
  transportes: boolean
  asistencia: boolean
  otros: boolean
  detalle_otros: string | null
  estado: EstadoSolicitud
  tipo: string
  modalidad: string
  observaciones: string | null
}

const ESTADO_BADGE: Record<EstadoSolicitud, BadgeVariant> = {
  'FINALIZADO':           'emerald',
  'EN TRÁMITE':           'blue',
  'PENDIENTE':            'amber',
  'ANULADO':              'rose',
  'COTIZACIÓN RECHAZADA': 'slate',
}

function ServiceDots({ s }: { s: Solicitud }) {
  const items = [
    { label: 'Tiquetes',   v: s.tiquetes },
    { label: 'Hoteles',    v: s.hoteles },
    { label: 'Transportes',v: s.transportes },
    { label: 'Asistencia', v: s.asistencia },
    { label: 'Otros',      v: s.otros },
  ]
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {items.map(({ label, v }) => v && (
        <span key={label}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
                     bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200
                     dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20">
          {label}
        </span>
      ))}
    </div>
  )
}

interface ConfirmModalProps {
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function ConfirmModal({ onConfirm, onCancel, loading }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700
                      shadow-2xl p-7 w-full max-w-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white text-center mb-1">
          ¿Dar de baja esta solicitud?
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
          Se marcará como <strong>ANULADO</strong>. Esta acción no elimina el registro.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-rose-600! hover:bg-rose-700! shadow-rose-600/20"
            onClick={onConfirm}
            loading={loading}
          >
            Dar de baja
          </Button>
        </div>
      </div>
    </div>
  )
}

interface Props {
  onNew: () => void
  onEdit: (s: Solicitud) => void
}

export default function SolicitudesListPage({ onNew, onEdit }: Props) {
  const { user } = useAuth()
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('user_id', user!.id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setSolicitudes(data as Solicitud[])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const handleCancel = async () => {
    if (!cancelId) return
    setCancelling(true)
    const { error } = await supabase
      .from('solicitudes')
      .update({ estado: 'ANULADO' })
      .eq('id', cancelId)
    if (error) {
      setError(error.message)
    } else {
      setSolicitudes(prev => prev.map(s => s.id === cancelId ? { ...s, estado: 'ANULADO' } : s))
      setSuccessMsg('Solicitud marcada como ANULADO.')
      setTimeout(() => setSuccessMsg(null), 4000)
    }
    setCancelling(false)
    setCancelId(null)
  }

  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <AppShell>
      {cancelId && (
        <ConfirmModal
          onConfirm={handleCancel}
          onCancel={() => setCancelId(null)}
          loading={cancelling}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Page header */}
        <div className="flex items-start justify-between mb-7 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Mis solicitudes
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {loading ? 'Cargando...' : `${solicitudes.length} registro${solicitudes.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button onClick={onNew} size="md">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nueva solicitud
          </Button>
        </div>

        {successMsg && <Alert variant="success" className="mb-5">{successMsg}</Alert>}
        {error      && <Alert variant="error"   className="mb-5">{error}</Alert>}

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-semibold mb-1">Sin solicitudes aún</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">Crea tu primera solicitud operativa.</p>
            <Button onClick={onNew}>Nueva solicitud</Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Tabla desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-800">
                    {['Fecha', 'Localizador', 'Cliente', 'Asesor', 'Tipo', 'Servicios', 'Modalidad', 'Estado', ''].map(h => (
                      <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                  {solicitudes.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors group">
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmt(s.fecha)}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                          {s.localizador}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200 max-w-36 truncate" title={s.cliente}>{s.cliente}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{s.asesor}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{s.tipo}</td>
                      <td className="px-4 py-3.5"><ServiceDots s={s} /></td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{s.modalidad}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge variant={ESTADO_BADGE[s.estado]}>{s.estado}</Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(s)}
                            title="Editar"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50
                                       dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {s.estado !== 'ANULADO' && (
                            <button
                              onClick={() => setCancelId(s.id)}
                              title="Dar de baja"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50
                                         dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards mobile */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-gray-800">
              {solicitudes.map(s => (
                <div key={s.id} className="p-4 hover:bg-slate-50 dark:hover:bg-gray-800/40 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded mr-2">
                        {s.localizador}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{fmt(s.fecha)}</span>
                    </div>
                    <Badge variant={ESTADO_BADGE[s.estado]}>{s.estado}</Badge>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-0.5">{s.cliente}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{s.asesor} · {s.tipo} · {s.modalidad}</p>
                  <ServiceDots s={s} />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => onEdit(s)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                                 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10
                                 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    {s.estado !== 'ANULADO' && (
                      <button
                        onClick={() => setCancelId(s.id)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                                   text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10
                                   hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        Dar de baja
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
