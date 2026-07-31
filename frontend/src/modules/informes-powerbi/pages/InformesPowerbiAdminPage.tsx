import { useEffect, useState, useCallback } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import PageTitle from '@/components/ui/PageTitle'
import { ChartPieIcon } from '@/modules/icons'
import {
  fetchInformesAdmin,
  saveInforme,
  deleteInforme,
  type InformePowerbiAdmin,
  type InformePowerbiAcceso,
} from '../services/informesPowerbiService'

const UNIDADES: { slug: string; label: string }[] = [
  { slug: 'corp', label: 'Solicitud Corp' },
  { slug: 'mice', label: 'MICE' },
  { slug: 'siigo', label: 'Carga Siigo' },
  { slug: 'anticipos', label: 'Facturas Excluidas' },
]

const ROLES: { slug: string; label: string }[] = [
  { slug: 'coordinador', label: 'Coordinador' },
  { slug: 'asesor', label: 'Asesor' },
  { slug: 'tiqueteador', label: 'Tiqueteador' },
  { slug: 'financiero', label: 'Financiero' },
  { slug: 'analista_bsp', label: 'Analista BSP' },
]

const UNIDAD_LABELS = Object.fromEntries(UNIDADES.map(u => [u.slug, u.label]))
const ROL_LABELS = Object.fromEntries(ROLES.map(r => [r.slug, r.label]))

function accesoKey(a: InformePowerbiAcceso) {
  return `${a.unidad_slug}:${a.rol_slug}`
}

// ── Matriz de accesos: checkbox por combinación unidad × rol ─────────────────
function AccesosMatrix({
  accesos,
  onChange,
}: {
  accesos: InformePowerbiAcceso[]
  onChange: (accesos: InformePowerbiAcceso[]) => void
}) {
  const set = new Set(accesos.map(accesoKey))

  const toggle = (unidad_slug: string, rol_slug: string) => {
    const key = `${unidad_slug}:${rol_slug}`
    if (set.has(key)) {
      onChange(accesos.filter(a => accesoKey(a) !== key))
    } else {
      onChange([...accesos, { unidad_slug, rol_slug }])
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-800/40">
            <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Unidad</th>
            {ROLES.map(r => (
              <th key={r.slug} className="px-3 py-2 text-center font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                {r.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
          {UNIDADES.map(u => (
            <tr key={u.slug}>
              <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{u.label}</td>
              {ROLES.map(r => {
                const checked = set.has(`${u.slug}:${r.slug}`)
                return (
                  <td key={r.slug} className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggle(u.slug, r.slug)}
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-all
                        ${checked
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-200 dark:border-gray-700 text-transparent hover:border-indigo-400'
                        }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface FormState {
  id: string | null
  nombre: string
  descripcion: string
  link: string
  imagen: string
  accesos: InformePowerbiAcceso[]
}

const EMPTY_FORM: FormState = { id: null, nombre: '', descripcion: '', link: '', imagen: '', accesos: [] }

function InformeModal({ initial, onClose, onSaved }: {
  initial: FormState
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<{ nombre?: string; link?: string; accesos?: string }>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
    if (!form.link.trim()) e.link = 'El link es obligatorio.'
    if (form.accesos.length === 0) e.accesos = 'Asigna al menos una combinación de rol y unidad.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    setSaving(true)
    const { error } = await saveInforme(form)
    setSaving(false)
    if (error) { setError(error); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-800">
          <PageTitle as="h2" size="modal">{form.id ? 'Editar informe' : 'Nuevo informe'}</PageTitle>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nombre" required htmlFor="pbi_nombre" error={errors.nombre}>
              <Input id="pbi_nombre" type="text" value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                placeholder="Ej. Ventas MICE 2026" error={!!errors.nombre} />
            </FormField>
            <FormField label="Link" required htmlFor="pbi_link" error={errors.link}>
              <Input id="pbi_link" type="url" value={form.link}
                onChange={e => set('link', e.target.value)}
                placeholder="https://app.powerbi.com/..." error={!!errors.link} />
            </FormField>
          </div>

          <FormField label="Descripción" htmlFor="pbi_desc" optional>
            <Input id="pbi_desc" type="text" value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              placeholder="Breve descripción del informe" />
          </FormField>

          <FormField label="Imagen de previsualización (URL)" htmlFor="pbi_imagen" optional
            hint="Opcional. Si se deja vacío, se muestra un ícono genérico.">
            <Input id="pbi_imagen" type="url" value={form.imagen}
              onChange={e => set('imagen', e.target.value)}
              placeholder="https://..." />
          </FormField>

          <FormField label="Quién puede ver este informe" required error={errors.accesos}>
            <AccesosMatrix accesos={form.accesos} onChange={v => set('accesos', v)} />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InformesPowerbiAdminPage() {
  const [informes, setInformes] = useState<InformePowerbiAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [editing, setEditing] = useState<FormState | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchInformesAdmin()
    setInformes(data)
    setError(error)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const flash = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const { error } = await deleteInforme(id)
    setDeletingId(null)
    if (error) { setError(error); return }
    setInformes(prev => prev.filter(i => i.id !== id))
    flash('Informe eliminado.')
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? 'Cargando...' : `${informes.length} informe${informes.length !== 1 ? 's' : ''} configurado${informes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => setEditing(EMPTY_FORM)} size="md">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo informe
        </Button>
      </div>

      {successMsg && <Alert variant="success" className="mb-5">{successMsg}</Alert>}
      {error && <Alert variant="error" className="mb-5">{error}</Alert>}

      {editing && (
        <InformeModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { load(); flash(editing.id ? 'Informe actualizado.' : 'Informe creado.') }}
        />
      )}

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : informes.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800">
          <p className="text-slate-500 dark:text-slate-400">No hay informes configurados.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-800/40">
                  {['Informe', 'Accesos', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {informes.map(informe => (
                  <tr key={informe.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-500 overflow-hidden">
                          {informe.imagen ? (
                            <img src={informe.imagen} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ChartPieIcon />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{informe.nombre}</p>
                          {informe.descripcion && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-70">{informe.descripcion}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {informe.accesos.length === 0 ? (
                        <span className="text-xs text-slate-400 dark:text-slate-600 italic">Sin accesos</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-90">
                          {informe.accesos.map(a => (
                            <span key={`${a.unidad_slug}:${a.rol_slug}`}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                              {UNIDAD_LABELS[a.unidad_slug] ?? a.unidad_slug}: {ROL_LABELS[a.rol_slug] ?? a.rol_slug}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditing({
                            id: informe.id,
                            nombre: informe.nombre,
                            descripcion: informe.descripcion ?? '',
                            link: informe.link,
                            imagen: informe.imagen ?? '',
                            accesos: informe.accesos,
                          })}
                          title="Editar"
                          className="w-7 h-7 flex items-center justify-center rounded-lg
                                     text-slate-400 hover:text-indigo-600 hover:bg-indigo-50
                                     dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(informe.id)}
                          disabled={deletingId === informe.id}
                          title="Eliminar"
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors
                                     text-slate-400 hover:text-rose-600 hover:bg-rose-50
                                     dark:hover:text-rose-400 dark:hover:bg-rose-500/10
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
