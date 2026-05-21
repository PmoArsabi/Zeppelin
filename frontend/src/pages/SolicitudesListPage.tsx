import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/layout/AppShell'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import Select from '../components/ui/Select'
import type { BadgeVariant } from '../components/ui/Badge'
import type { NavigateFn } from '@/modules'
import { ESTADOS, TIPOS, MODALIDADES, type EstadoSolicitud } from '@/modules/solicitudes-corporativos/types'

interface Solicitud {
  id: string
  created_at: string
  updated_at: string
  fecha: string
  localizador: string
  cliente: string
  asesor: string
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
  status: boolean
}

const ESTADO_BADGE: Record<EstadoSolicitud, BadgeVariant> = {
  'FINALIZADO':           'emerald',
  'EN TRÁMITE':           'blue',
  'PENDIENTE':            'amber',
  'ANULADO':              'rose',
  'COTIZACIÓN RECHAZADA': 'slate',
}

const SERVICIOS_MAP: { key: keyof Solicitud; label: string }[] = [
  { key: 'tiquetes',    label: 'Tiquetes' },
  { key: 'hoteles',     label: 'Hoteles' },
  { key: 'transportes', label: 'Transportes' },
  { key: 'asistencia',  label: 'Asistencia' },
  { key: 'otros',       label: 'Otros' },
]

const TH =
  'px-3 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap'
const TD = 'px-3 py-2 text-xs text-slate-600 dark:text-slate-300'

function ServiceDots({ s }: { s: Solicitud }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {SERVICIOS_MAP.map(({ key, label }) => s[key] && (
        <span
          key={label}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium
                     bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200
                     dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20"
        >
          {label}
        </span>
      ))}
    </div>
  )
}

// ── Filtros ───────────────────────────────────────────────────────────────────
interface Filters {
  search: string
  estado: string
  tipo: string
  modalidad: string
}

const EMPTY_FILTERS: Filters = {
  search: '',
  estado: '',
  tipo: '',
  modalidad: '',
}

function FilterField({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{label}</span>
      <Select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="py-2.5 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300"
      >
        <option value="">Todos</option>
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    </div>
  )
}

function FilterSearchField({
  label,
  value,
  onChange,
  placeholder,
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{label}</span>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                     bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white
                     placeholder-slate-400 dark:placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400
                     transition-all"
        />
      </div>
    </div>
  )
}

function FilterBar({ filters, onChange, onClear, total, filtered }: {
  filters: Filters
  onChange: (f: Filters) => void
  onClear: () => void
  total: number
  filtered: number
}) {
  const set = (k: keyof Filters, v: string) => onChange({ ...filters, [k]: v })
  const active = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-4 mb-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pt-1">Filtros</p>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl
                       text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700
                       hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        <FilterSearchField
          label="Buscar"
          value={filters.search}
          onChange={v => set('search', v)}
          placeholder="Localizador, cliente o asesor..."
          className="sm:col-span-2 lg:col-span-2"
        />
        <FilterField label="Estado" value={filters.estado} onChange={v => set('estado', v)} options={[...ESTADOS]} />
        <FilterField label="Tipo" value={filters.tipo} onChange={v => set('tipo', v)} options={[...TIPOS]} />
        <FilterField
          label="Modalidad"
          value={filters.modalidad}
          onChange={v => set('modalidad', v)}
          options={[...MODALIDADES]}
        />
      </div>

      {active && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Mostrando <span className="font-semibold text-slate-600 dark:text-slate-300">{filtered}</span> de{' '}
          <span className="font-semibold">{total}</span> registros
        </p>
      )}
    </div>
  )
}

// ── Helpers de DetailPanel definidos fuera del componente ────────────────────
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-800 dark:text-slate-200">{value || <span className="text-slate-400 italic">—</span>}</span>
    </div>
  )
}

// ── Panel de detalle ──────────────────────────────────────────────────────────
function DetailPanel({ s, onClose, onEdit, onToggleStatus, onAnular, actioning }: {
  s: Solicitud
  onClose: () => void
  onEdit: () => void
  onToggleStatus: () => void
  onAnular: () => void
  actioning: boolean
}) {
  const fmt   = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
  const fmtTs = (ts: string) => new Date(ts).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border-l border-slate-200 dark:border-gray-700
                      shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {s.localizador}
              </span>
              <Badge variant={ESTADO_BADGE[s.estado]}>{s.estado}</Badge>
              {!s.status && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                 bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-gray-700">
                  Inactiva
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Creado {fmtTs(s.created_at)}
            </p>
            {s.updated_at !== s.created_at && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Actualizado {fmtTs(s.updated_at)}
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400
                       hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Información básica
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailRow label="Fecha" value={fmt(s.fecha)} />
              <DetailRow label="Localizador" value={s.localizador} />
              <DetailRow label="Cliente" value={<span className="line-clamp-2">{s.cliente}</span>} />
              <DetailRow label="Asesor" value={s.asesor} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Clasificación
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <DetailRow label="Estado" value={<Badge variant={ESTADO_BADGE[s.estado]}>{s.estado}</Badge>} />
              <DetailRow label="Tipo" value={s.tipo} />
              <DetailRow label="Modalidad" value={s.modalidad} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Servicios
            </h3>
            <div className="grid grid-cols-2 gap-y-2">
              {SERVICIOS_MAP.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    s[key] ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-slate-100 dark:bg-gray-800'
                  }`}>
                    {s[key] ? (
                      <svg className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 12 12" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 6l3 3 5-5" />
                      </svg>
                    ) : (
                      <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 12 12" stroke="currentColor">
                        <path strokeLinecap="round" strokeWidth={1.5} d="M3 6h6" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm ${s[key] ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            {s.otros && s.detalle_otros && (
              <div className="mt-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-800 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-700 dark:text-slate-200">Detalle: </span>
                {s.detalle_otros}
              </div>
            )}
          </section>

          {s.observaciones && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Observaciones
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-gray-800
                            rounded-xl px-3 py-2.5 leading-relaxed">
                {s.observaciones}
              </p>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-800 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <Button onClick={onEdit} variant="secondary" className="flex-1 justify-center" disabled={actioning}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </Button>
            <Button
              onClick={onToggleStatus}
              loading={actioning}
              className={`flex-1 justify-center ${
                s.status
                  ? 'bg-amber-500! hover:bg-amber-600! shadow-amber-500/20'
                  : 'bg-emerald-600! hover:bg-emerald-700! shadow-emerald-600/20'
              }`}
            >
              {s.status ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Inactivar
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Activar
                </>
              )}
            </Button>
          </div>
          {s.estado !== 'ANULADO' && (
            <Button
              onClick={onAnular}
              loading={actioning}
              variant="ghost"
              className="w-full justify-center text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Dar de baja (ANULADO)
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
interface Props {
  onNew: () => void
  onEdit: (s: Solicitud) => void
  onView: (s: Solicitud) => void
  onNavigate: NavigateFn
}

export default function SolicitudesListPage({ onNew, onEdit, onView, onNavigate }: Props) {
  const { user, isAdmin } = useAuth()
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [successMsg, setSuccessMsg]   = useState<string | null>(null)
  const [actioning, setActioning]     = useState(false)
  const [detail, setDetail]           = useState<Solicitud | null>(null)
  const [filters, setFilters]         = useState<Filters>(EMPTY_FILTERS)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const query = supabase
      .from('solicitudes')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })

    // RLS ya filtra por user_id para asesores; admin ve todo via policy
    if (!isAdmin) query.eq('user_id', user!.id)

    const { data, error } = await query
    if (error) setError(error.message)
    else setSolicitudes(data as Solicitud[])
    setLoading(false)
  }, [user, isAdmin])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    return solicitudes.filter(s => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !s.localizador.toLowerCase().includes(q) &&
          !s.cliente.toLowerCase().includes(q) &&
          !s.asesor.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      if (filters.estado && s.estado !== filters.estado) return false
      if (filters.tipo && s.tipo !== filters.tipo) return false
      if (filters.modalidad && s.modalidad !== filters.modalidad) return false
      return true
    })
  }, [solicitudes, filters])

  const updateLocal = (id: string, patch: Partial<Solicitud>) => {
    setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    setDetail(prev => prev?.id === id ? { ...prev, ...patch } : prev)
  }

  const flash = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const handleToggleStatus = async () => {
    if (!detail) return
    setActioning(true)
    const newStatus = !detail.status
    const { error } = await supabase
      .from('solicitudes')
      .update({ status: newStatus })
      .eq('id', detail.id)
    if (error) setError(error.message)
    else {
      updateLocal(detail.id, { status: newStatus })
      flash(newStatus ? 'Solicitud activada.' : 'Solicitud inactivada.')
    }
    setActioning(false)
  }

  const handleAnular = async () => {
    if (!detail) return
    setActioning(true)
    const { error } = await supabase
      .from('solicitudes')
      .update({ estado: 'ANULADO' })
      .eq('id', detail.id)
    if (error) setError(error.message)
    else {
      updateLocal(detail.id, { estado: 'ANULADO' })
      flash('Solicitud marcada como ANULADO.')
    }
    setActioning(false)
  }

  const fmt = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
  const fmtTs = (ts: string) => new Date(ts).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)
  const countLabel = loading
    ? 'Cargando...'
    : hasActiveFilters
      ? `${filtered.length} de ${solicitudes.length} registro${solicitudes.length !== 1 ? 's' : ''}`
      : `${solicitudes.length} registro${solicitudes.length !== 1 ? 's' : ''}`

  return (
    <AppShell activeModule="solicitudes-corporativos" onNavigate={onNavigate}>
      {detail && (
        <DetailPanel
          s={detail}
          onClose={() => setDetail(null)}
          onEdit={() => { setDetail(null); onEdit(detail) }}
          onToggleStatus={handleToggleStatus}
          onAnular={handleAnular}
          actioning={actioning}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Solicitud Corporativo
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{countLabel}</p>
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

        {!loading && solicitudes.length > 0 && (
          <FilterBar
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
            total={solicitudes.length}
            filtered={filtered.length}
          />
        )}

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
            <p className="text-slate-600 dark:text-slate-300 font-semibold mb-1 text-sm">Sin solicitudes aún</p>
            <p className="text-sm text-slate-400">Crea tu primera solicitud operativa.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800">
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              Sin resultados para los filtros aplicados.
            </p>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-x-auto">

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[960px] text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-800 text-left">
                    <th className={TH}>Estado</th>
                    <th className={TH}>Fecha</th>
                    <th className={TH}>Localizador</th>
                    <th className={`${TH} min-w-[140px]`}>Cliente / Asesor</th>
                    <th className={TH}>Tipo</th>
                    <th className={TH}>Servicios</th>
                    <th className={TH}>Modalidad</th>
                    <th className={TH}>Actualizado</th>
                    <th className={`${TH} text-right`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr
                      key={s.id}
                      onClick={() => setDetail(s)}
                      className={`border-b border-slate-50 dark:border-gray-800/80 transition-colors cursor-pointer ${
                        s.status
                          ? 'hover:bg-slate-50/80 dark:hover:bg-gray-800/40'
                          : 'opacity-55 hover:opacity-75'
                      }`}
                    >
                      <td className={TD}>
                        <Badge variant={ESTADO_BADGE[s.estado]} className="text-[10px] px-1.5 py-0">
                          {s.estado}
                        </Badge>
                      </td>
                      <td className={`${TD} text-slate-500 dark:text-slate-400 whitespace-nowrap`}>
                        {fmt(s.fecha)}
                      </td>
                      <td className={TD}>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {s.localizador}
                        </span>
                      </td>
                      <td className={`${TD} max-w-[160px]`}>
                        <p
                          className="font-medium text-slate-800 dark:text-slate-100 truncate"
                          title={s.cliente}
                        >
                          {s.cliente}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{s.asesor}</p>
                      </td>
                      <td className={`${TD} text-slate-500 whitespace-nowrap`}>{s.tipo}</td>
                      <td className={TD}>
                        <ServiceDots s={s} />
                      </td>
                      <td className={`${TD} text-slate-500 whitespace-nowrap`}>{s.modalidad}</td>
                      <td className={`${TD} text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]`}>
                        {fmtTs(s.updated_at)}
                      </td>
                      <td className={`${TD} text-right`} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {/* Ver */}
                          <button
                            type="button"
                            onClick={() => onView(s)}
                            title="Ver solicitud"
                            aria-label="Ver solicitud"
                            className="w-7 h-7 flex items-center justify-center rounded-lg
                                       text-slate-400 hover:text-indigo-600 hover:bg-indigo-50
                                       dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => onEdit(s)}
                            title="Editar"
                            className="w-7 h-7 flex items-center justify-center rounded-lg
                                       text-slate-400 hover:text-amber-600 hover:bg-amber-50
                                       dark:hover:text-amber-400 dark:hover:bg-amber-500/10 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {/* Activar / Inactivar */}
                          <button
                            onClick={async () => {
                              const newStatus = !s.status
                              const { error } = await supabase.from('solicitudes').update({ status: newStatus }).eq('id', s.id)
                              if (!error) {
                                updateLocal(s.id, { status: newStatus })
                                flash(newStatus ? 'Solicitud activada.' : 'Solicitud inactivada.')
                              }
                            }}
                            title={s.status ? 'Inactivar' : 'Activar'}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors
                              ${s.status
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10'
                              }`}
                          >
                            {s.status ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards mobile — estilo compacto como el ejemplo */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-gray-800">
              {filtered.map(s => (
                <div key={s.id} className={`p-4 transition-colors ${!s.status ? 'opacity-60' : ''}`}>
                  {/* Fila superior: tipo + estado */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                      {s.tipo}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.status ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <Badge variant={ESTADO_BADGE[s.estado]} className="text-[10px] px-1.5 py-0">
                        {s.estado}
                      </Badge>
                    </div>
                  </div>

                  {/* Info principal */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px] font-medium">Cliente</span>
                      <p className="text-slate-800 dark:text-slate-200 font-medium leading-tight truncate">{s.cliente}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px]">{s.asesor}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px] font-medium">Localizador</span>
                      <p className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{s.localizador}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px]">{fmt(s.fecha)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px] font-medium">Modalidad</span>
                      <p className="text-slate-700 dark:text-slate-300">{s.modalidad}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px] font-medium">Actualizado</span>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px]">{fmtTs(s.updated_at)}</p>
                    </div>
                  </div>

                  <ServiceDots s={s} />

                  {/* Acciones */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => onView(s)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl
                                 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10
                                 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver
                    </button>
                    <button
                      onClick={() => onEdit(s)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl
                                 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10
                                 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={async () => {
                        const newStatus = !s.status
                        const { error } = await supabase.from('solicitudes').update({ status: newStatus }).eq('id', s.id)
                        if (!error) {
                          updateLocal(s.id, { status: newStatus })
                          flash(newStatus ? 'Solicitud activada.' : 'Solicitud inactivada.')
                        }
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-colors
                        ${s.status
                          ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20'
                          : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                        }`}
                    >
                      {s.status ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          Inactivar
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Activar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasActiveFilters && (
              <p className="px-4 py-3 border-t border-slate-100 dark:border-gray-800 text-xs text-slate-400 dark:text-slate-500">
                {filtered.length} registro{filtered.length !== 1 ? 's' : ''} (de {solicitudes.length} total)
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
