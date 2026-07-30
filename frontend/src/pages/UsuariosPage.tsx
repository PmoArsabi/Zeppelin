import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/layout/AppShell'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import Alert from '../components/ui/Alert'
import FormField from '../components/ui/FormField'
import Input from '../components/ui/Input'
import CustomSelect from '../components/ui/CustomSelect'
import type { NavigateFn } from '@/modules'
import { formatDateDDMMYYYY } from '@/lib/formatDate'

interface UserRow {
  id: string
  display_name: string
  email: string
  is_admin: boolean
  created_at: string
  disabled: boolean
  roles_por_unidad: Record<string, string>
}

type RoleOption = 'coordinador' | 'asesor' | 'tiqueteador' | 'financiero' | 'analista_bsp'
type UnidadSlug = 'mice' | 'corp' | 'siigo' | 'anticipos'

const ROLE_OPTIONS: { value: RoleOption; label: string }[] = [
  { value: 'coordinador',  label: 'Coordinador' },
  { value: 'asesor',       label: 'Asesor' },
  { value: 'tiqueteador',  label: 'Tiqueteador' },
  { value: 'financiero',   label: 'Financiero' },
  { value: 'analista_bsp', label: 'Analista BSP' },
]

const SIN_ACCESO = '__sin_acceso__'
const SELECT_UNIDAD_OPTIONS = [{ value: SIN_ACCESO, label: '-- Sin acceso --' }, ...ROLE_OPTIONS]

const UNIDADES: { slug: UnidadSlug; label: string }[] = [
  { slug: 'corp', label: 'Solicitud Corp' },
  { slug: 'mice', label: 'MICE' },
  { slug: 'siigo', label: 'Carga Siigo' },
  { slug: 'anticipos', label: 'Facturas Excluidas' },
]

const ROLE_LABELS: Record<string, string> = {
  coordinador: 'Coordinador',
  asesor: 'Asesor',
  tiqueteador: 'Tiqueteador',
  financiero: 'Financiero',
  analista_bsp: 'Analista BSP',
}

type RolesPorUnidadForm = Partial<Record<UnidadSlug, RoleOption>>

function rolesFormToPayload(roles: RolesPorUnidadForm): { unidad_slug: string; rol_slug: string }[] {
  return Object.entries(roles)
    .filter((entry): entry is [UnidadSlug, RoleOption] => !!entry[1])
    .map(([unidad_slug, rol_slug]) => ({ unidad_slug, rol_slug }))
}

// ── Tabla de asignación módulo → rol, reutilizada en crear y editar ───────────
function RolesPorUnidadTable({
  roles,
  onChange,
  disabled,
}: {
  roles: RolesPorUnidadForm
  onChange: (roles: RolesPorUnidadForm) => void
  disabled?: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-gray-700 divide-y divide-slate-100 dark:divide-gray-800 overflow-hidden">
      {UNIDADES.map(u => (
        <div key={u.slug} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-gray-900">
          <span className="text-sm text-slate-700 dark:text-slate-300">{u.label}</span>
          <div className="w-44 shrink-0">
            <CustomSelect
              id={`rol_${u.slug}`}
              value={roles[u.slug] ?? SIN_ACCESO}
              onChange={v => {
                const next = { ...roles }
                if (v === SIN_ACCESO) delete next[u.slug]
                else next[u.slug] = v as RoleOption
                onChange(next)
              }}
              options={SELECT_UNIDAD_OPTIONS}
              disabled={disabled}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

interface NewUserForm {
  email: string
  display_name: string
  es_admin: boolean
  roles: RolesPorUnidadForm
  password: string
}

const EMPTY_FORM: NewUserForm = {
  email: '', display_name: '', es_admin: false, roles: {}, password: '',
}

interface Props {
  onNavigate: NavigateFn
}

// ── Modal crear usuario ───────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm]             = useState<NewUserForm>(EMPTY_FORM)
  const [errors, setErrors]         = useState<Partial<Record<'display_name' | 'email' | 'password' | 'roles', string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const set = <K extends keyof NewUserForm>(key: K, value: NewUserForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key as keyof typeof errors]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!form.display_name.trim()) e.display_name = 'El nombre es obligatorio.'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Ingresa un correo válido.'
    if (form.password && form.password.trim().length < 8)
      e.password = 'La contraseña debe tener al menos 8 caracteres.'
    if (!form.es_admin && Object.keys(form.roles).length === 0)
      e.roles = 'Asigna al menos un rol en un módulo, o marca como administrador.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session!.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: form.email.trim().toLowerCase(),
            display_name: form.display_name.trim(),
            es_admin: form.es_admin,
            roles: form.es_admin ? [] : rolesFormToPayload(form.roles),
            origin: window.location.origin,
            ...(form.password.trim() ? { password: form.password.trim() } : {}),
          }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al crear el usuario.')
      onCreated()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Error desconocido.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-800">
          <PageTitle as="h2" size="modal">Nuevo usuario</PageTitle>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {submitError && <Alert variant="error">{submitError}</Alert>}

          {form.password
            ? (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-sm text-amber-700 dark:text-amber-300">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                El usuario podrá iniciar sesión con esta contraseña provisional. Compártela de forma segura.
              </div>
            ) : (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-sm text-indigo-700 dark:text-indigo-300">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Se enviará un correo de invitación. El usuario configurará su contraseña al aceptar.
              </div>
            )
          }

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nombre completo" required htmlFor="cn_name" error={errors.display_name}>
              <Input id="cn_name" type="text" value={form.display_name}
                onChange={e => set('display_name', e.target.value)}
                placeholder="Ej. María García" error={!!errors.display_name} />
            </FormField>
            <FormField label="Correo electrónico" required htmlFor="cn_email" error={errors.email}>
              <Input id="cn_email" type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="usuario@empresa.com" error={!!errors.email} />
            </FormField>
          </div>

          <label className="flex items-center gap-2.5 px-1 py-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.es_admin}
              onChange={e => set('es_admin', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Es administrador (acceso total a todos los módulos)
            </span>
          </label>

          {!form.es_admin && (
            <FormField label="Rol por módulo" required error={errors.roles}>
              <RolesPorUnidadTable roles={form.roles} onChange={v => set('roles', v)} />
            </FormField>
          )}

          <FormField label="Contraseña provisional" htmlFor="cn_password"
            error={errors.password}
            hint="Opcional. Si la dejas vacía se enviará invitación por correo.">
            <Input id="cn_password" type="password" value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="Mín. 8 caracteres" error={!!errors.password} />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>Cancelar</Button>
            <Button type="submit" loading={submitting}>
              {form.password.trim() ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear usuario
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Enviar invitación
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal editar usuario ──────────────────────────────────────────────────────
function EditModal({ user, onClose, onSaved }: {
  user: UserRow
  onClose: () => void
  onSaved: (updated: Partial<UserRow>) => void
}) {
  const { user: me } = useAuth()
  const [displayName, setDisplayName] = useState(user.display_name)
  const [esAdmin, setEsAdmin]         = useState(user.is_admin)
  const [roles, setRoles]             = useState<RolesPorUnidadForm>(user.roles_por_unidad as RolesPorUnidadForm)
  const [disabled, setDisabled]       = useState(user.disabled)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const isSelf = me?.id === user.id

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) { setError('El nombre es obligatorio.'); return }
    if (!esAdmin && Object.keys(roles).length === 0) {
      setError('Asigna al menos un rol en un módulo, o marca como administrador.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session!.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            user_id: user.id,
            es_admin: esAdmin,
            display_name: displayName.trim(),
            roles: esAdmin ? [] : rolesFormToPayload(roles),
            ...(isSelf ? {} : { disabled }),
          }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al actualizar.')
      onSaved({
        display_name: displayName.trim(),
        is_admin: esAdmin,
        roles_por_unidad: esAdmin ? {} : (roles as Record<string, string>),
        disabled: isSelf ? user.disabled : disabled,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-800">
          <div>
            <PageTitle as="h2" size="modal">Editar usuario</PageTitle>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <FormField label="Nombre completo" required htmlFor="ed_name">
            <Input id="ed_name" type="text" value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Nombre completo" />
          </FormField>

          <label className="flex items-center gap-2.5 px-1 py-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={esAdmin}
              onChange={e => setEsAdmin(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Es administrador (acceso total a todos los módulos)
            </span>
          </label>

          {!esAdmin && (
            <FormField label="Rol por módulo" required>
              <RolesPorUnidadTable roles={roles} onChange={setRoles} />
            </FormField>
          )}

          {!isSelf && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Estado del usuario</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {disabled ? 'Inactivo — no puede iniciar sesión' : 'Activo'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDisabled(d => !d)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                  ${disabled ? 'bg-slate-200 dark:bg-gray-700' : 'bg-indigo-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                  ${disabled ? 'translate-x-1' : 'translate-x-6'}`} />
              </button>
            </div>
          )}
          {isSelf && (
            <p className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-gray-800 rounded-xl px-4 py-3">
              No puedes desactivar tu propia cuenta.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const UNIDAD_LABELS: Record<string, string> = { mice: 'MICE', corp: 'Corp', siigo: 'Siigo', anticipos: 'Facturas Excluidas' }
const UNIDAD_COLORS: Record<string, string> = {
  mice: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  corp: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  siigo: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  anticipos: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
}

const rolesBadges = (isAdmin: boolean, rolesPorUnidad: Record<string, string>) => {
  if (isAdmin)
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">Administrador</span>

  const entries = Object.entries(rolesPorUnidad ?? {})
  if (entries.length === 0)
    return <span className="text-xs text-slate-400 dark:text-slate-600 italic">Sin acceso</span>

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([unidad, rol]) => (
        <span key={unidad} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${UNIDAD_COLORS[unidad] ?? 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-400'}`}>
          {UNIDAD_LABELS[unidad] ?? unidad}: {ROLE_LABELS[rol] ?? rol}
        </span>
      ))}
    </div>
  )
}

const statusBadge = (disabled: boolean) =>
  disabled
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Inactivo
      </span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Activo
      </span>

// ── Página ────────────────────────────────────────────────────────────────────
export default function UsuariosPage({ onNavigate }: Props) {
  const { user: me } = useAuth()
  const [users, setUsers]           = useState<UserRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing]       = useState<UserRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.rpc('list_users_with_roles')
    if (error) setError(error.message)
    else setUsers((data ?? []) as UserRow[])
    setLoading(false)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const flash = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const handleQuickToggle = async (u: UserRow) => {
    if (me?.id === u.id) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session!.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ user_id: u.id, disabled: !u.disabled }),
        }
      )
      if (res.ok) {
        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, disabled: !u.disabled } : x))
        flash(u.disabled ? `${u.display_name} activado.` : `${u.display_name} inactivado.`)
      } else {
        const json = await res.json()
        setError(json.error ?? 'Error al cambiar estado.')
      }
    } catch {
      setError('Error de conexión.')
    }
  }


  return (
    <AppShell activeModule="usuarios" onNavigate={onNavigate}>
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { load(); flash('Usuario creado correctamente.') }}
        />
      )}
      {editing && (
        <EditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={patch => {
            setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, ...patch } : u))
            flash('Usuario actualizado.')
          }}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <PageTitle>Usuarios</PageTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {loading ? 'Cargando...' : `${users.length} usuario${users.length !== 1 ? 's' : ''} registrado${users.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} size="md">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo usuario
          </Button>
        </div>

        {successMsg && <Alert variant="success" className="mb-5">{successMsg}</Alert>}
        {error      && <Alert variant="error"   className="mb-5">{error}</Alert>}

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800">
            <p className="text-slate-500 dark:text-slate-400">No hay usuarios registrados.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">

            {/* Tabla desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-175">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-800/40">
                    {['Usuario', 'Correo', 'Roles por módulo', 'Estado', 'Fecha registro'].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-slate-50/60 dark:bg-gray-800/40">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                  {users.map(u => (
                    <tr key={u.id} className={`transition-colors ${u.disabled ? 'opacity-60 bg-slate-50/60 dark:bg-gray-800/20' : 'hover:bg-slate-50 dark:hover:bg-gray-800/50'}`}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                              {u.display_name?.[0]?.toUpperCase() ?? '?'}
                            </span>
                          </div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{u.display_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 max-w-45 truncate" title={u.email}>{u.email}</td>
                      <td className="px-4 py-3.5">{rolesBadges(u.is_admin, u.roles_por_unidad)}</td>
                      <td className="px-4 py-3.5">{statusBadge(u.disabled)}</td>
                      <td className="px-4 py-3.5 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">{formatDateDDMMYYYY(u.created_at)}</td>
                      <td className="px-4 py-3.5 sticky right-0 bg-white dark:bg-gray-900">
                        <div className="flex items-center gap-1.5">
                          {/* Editar */}
                          <button
                            onClick={() => setEditing(u)}
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
                          {/* Inactivar / Activar */}
                          {me?.id !== u.id && (
                            <button
                              onClick={() => handleQuickToggle(u)}
                              title={u.disabled ? 'Activar usuario' : 'Inactivar usuario'}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors
                                ${u.disabled
                                  ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10'
                                }`}
                            >
                              {u.disabled ? (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              )}
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
              {users.map(u => (
                <div key={u.id} className={`p-4 ${u.disabled ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                          {u.display_name?.[0]?.toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{u.display_name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 pl-12">
                    {statusBadge(u.disabled)}
                    <span className="text-xs text-slate-400 dark:text-slate-500">· Desde {formatDateDDMMYYYY(u.created_at)}</span>
                  </div>
                  <div className="mt-1 mb-3 pl-12">
                    {rolesBadges(u.is_admin, u.roles_por_unidad)}
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-gray-800">
                    <button
                      onClick={() => setEditing(u)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl
                                 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10
                                 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    {me?.id !== u.id && (
                      <button
                        onClick={() => handleQuickToggle(u)}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-colors
                          ${u.disabled
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                            : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20'
                          }`}
                      >
                        {u.disabled ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Activar
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Inactivar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-slate-100 dark:border-gray-800 text-xs text-slate-400 dark:text-slate-500">
              {users.length} usuario{users.length !== 1 ? 's' : ''} en total
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
