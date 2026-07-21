import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/ui/PageTitle'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import type { NavigateFn } from '@/modules/types'

interface Unidad  { id: number; nombre: string; slug: string; orden: number }
interface Rol     { id: number; nombre: string; slug: string }
interface Permiso { id: number; nombre: string; slug: string }
interface RupRow  { rol_id: number; unidad_id: number; permiso_id: number }

const PERMISO_ORDER = ['ver', 'crear', 'editar', 'eliminar']

const PERMISO_ACTIVE: Record<string, string> = {
  ver:      'bg-sky-600 text-white border-sky-600',
  crear:    'bg-emerald-600 text-white border-emerald-600',
  editar:   'bg-amber-500 text-white border-amber-500',
  eliminar: 'bg-rose-600 text-white border-rose-600',
}

const PERMISO_BADGE: Record<string, string> = {
  ver:      'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20',
  crear:    'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  editar:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
  eliminar: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20',
}

const ROL_LABELS: Record<string, string> = {
  coordinador: 'Coordinador',
  asesor:      'Asesor',
  tiqueteador: 'Tiqueteador',
  financiero:  'Financiero',
}

const UNIDAD_LABELS: Record<string, string> = {
  anticipos: 'Facturas Excluidas',
}

interface Props { onNavigate: NavigateFn }

export default function RolesPermisosPage({ onNavigate }: Props) {
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [roles, setRoles]       = useState<Rol[]>([])
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [matrix, setMatrix]     = useState<RupRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)
  const [draft, setDraft]       = useState<Set<string>>(new Set())

  const key = (rol_id: number, unidad_id: number, permiso_id: number) =>
    `${rol_id}:${unidad_id}:${permiso_id}`

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [u, r, p, rup] = await Promise.all([
      supabase.rpc('rbac_get_unidades'),
      supabase.rpc('rbac_get_roles'),
      supabase.rpc('rbac_get_permisos'),
      supabase.rpc('rbac_get_rol_unidad_permisos'),
    ])

    if (u.error || r.error || p.error || rup.error) {
      setError((u.error ?? r.error ?? p.error ?? rup.error)?.message ?? 'Error cargando datos.')
      setLoading(false)
      return
    }

    const sortedPermisos = ((p.data ?? []) as Permiso[]).sort(
      (a, b) => PERMISO_ORDER.indexOf(a.slug) - PERMISO_ORDER.indexOf(b.slug)
    )
    const filteredRoles = ((r.data ?? []) as Rol[]).filter(r => r.slug !== 'admin')
    const rupData = (rup.data ?? []) as RupRow[]

    setUnidades((u.data ?? []) as Unidad[])
    setRoles(filteredRoles)
    setPermisos(sortedPermisos)
    setMatrix(rupData)
    setDraft(new Set(rupData.map(r => key(r.rol_id, r.unidad_id, r.permiso_id))))
    setLoading(false)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  const toggle = (rol_id: number, unidad_id: number, permiso_id: number) => {
    const k = key(rol_id, unidad_id, permiso_id)
    setDraft(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k); else next.add(k)
      return next
    })
  }

  const isActive = (rol_id: number, unidad_id: number, permiso_id: number) =>
    draft.has(key(rol_id, unidad_id, permiso_id))

  const hasChanges = () => {
    const original = new Set(matrix.map(r => key(r.rol_id, r.unidad_id, r.permiso_id)))
    if (draft.size !== original.size) return true
    for (const k of draft) if (!original.has(k)) return true
    return false
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const original = new Set(matrix.map(r => key(r.rol_id, r.unidad_id, r.permiso_id)))
      const toInsert: RupRow[] = []
      const toDelete: RupRow[] = []

      for (const k of draft)
        if (!original.has(k)) {
          const [rol_id, unidad_id, permiso_id] = k.split(':').map(Number)
          toInsert.push({ rol_id, unidad_id, permiso_id })
        }
      for (const k of original)
        if (!draft.has(k)) {
          const [rol_id, unidad_id, permiso_id] = k.split(':').map(Number)
          toDelete.push({ rol_id, unidad_id, permiso_id })
        }

      // Aplicar cambios via RPC (cada llamada es atómica en la función PL/pgSQL)
      const calls = [
        ...toInsert.map(r => supabase.rpc('rbac_set_permiso', { p_rol_id: r.rol_id, p_unidad_id: r.unidad_id, p_permiso_id: r.permiso_id, p_activo: true })),
        ...toDelete.map(r => supabase.rpc('rbac_set_permiso', { p_rol_id: r.rol_id, p_unidad_id: r.unidad_id, p_permiso_id: r.permiso_id, p_activo: false })),
      ]

      const results = await Promise.all(calls)
      const failed = results.find(r => r.error)
      if (failed?.error) throw new Error(failed.error.message)

      setMatrix([...draft].map(k => {
        const [rol_id, unidad_id, permiso_id] = k.split(':').map(Number)
        return { rol_id, unidad_id, permiso_id }
      }))
      setSuccess('Permisos actualizados correctamente.')
      setTimeout(() => setSuccess(null), 4000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const discard = () =>
    setDraft(new Set(matrix.map(r => key(r.rol_id, r.unidad_id, r.permiso_id))))

  const changed = hasChanges()

  return (
    <AppShell activeModule="roles-permisos" onNavigate={onNavigate}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        <div className="flex items-start justify-between mb-2 gap-4 flex-wrap">
          <div>
            <PageTitle>Roles y Permisos</PageTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Define qué puede hacer cada rol en cada unidad de negocio.
            </p>
          </div>
          {changed && (
            <div className="flex gap-2 shrink-0">
              <Button variant="secondary" onClick={discard} disabled={saving}>Descartar</Button>
              <Button onClick={save} loading={saving}>Guardar cambios</Button>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 px-4 py-3 mb-6 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-sm text-indigo-700 dark:text-indigo-300">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          El rol <strong className="font-semibold mx-1">Administrador</strong> tiene acceso total a todas las unidades y no requiere configuración de permisos.
        </div>

        {error   && <Alert variant="error"   className="mb-5">{error}</Alert>}
        {success && <Alert variant="success" className="mb-5">{success}</Alert>}

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {unidades.map(unidad => (
              <div key={unidad.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">

                <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-800/40 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Unidad: {UNIDAD_LABELS[unidad.slug] ?? unidad.nombre}
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-gray-800">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-44">
                          Rol
                        </th>
                        {permisos.map(p => (
                          <th key={p.id} className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border font-medium
                              ${PERMISO_BADGE[p.slug] ?? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-gray-800 dark:text-slate-400 dark:border-gray-700'}`}>
                              {p.nombre}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                      {roles.map(rol => (
                        <tr key={rol.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {ROL_LABELS[rol.slug] ?? rol.nombre}
                            </span>
                          </td>
                          {permisos.map(permiso => {
                            const active = isActive(rol.id, unidad.id, permiso.id)
                            return (
                              <td key={permiso.id} className="px-4 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggle(rol.id, unidad.id, permiso.id)}
                                  title={active ? `Quitar "${permiso.nombre}"` : `Dar "${permiso.nombre}"`}
                                  className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border-2 transition-all duration-150
                                    ${active
                                      ? (PERMISO_ACTIVE[permiso.slug] ?? 'bg-indigo-600 text-white border-indigo-600') + ' shadow-sm'
                                      : 'border-slate-200 dark:border-gray-700 text-slate-300 dark:text-slate-600 hover:border-slate-400 dark:hover:border-gray-500'
                                    }`}
                                >
                                  {active ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botones flotantes cuando hay cambios pendientes */}
        {changed && !loading && (
          <div className="fixed bottom-6 right-6 flex gap-2 z-30">
            <div className="flex gap-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-2xl shadow-xl px-4 py-3">
              <span className="text-sm text-slate-500 dark:text-slate-400 self-center mr-2">Cambios sin guardar</span>
              <Button variant="secondary" onClick={discard} disabled={saving} size="sm">Descartar</Button>
              <Button onClick={save} loading={saving} size="sm">Guardar</Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
