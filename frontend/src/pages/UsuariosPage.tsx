import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/layout/AppShell'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import FormField from '../components/ui/FormField'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

interface UserRow {
  id: string
  display_name: string
  email: string
  role: string
  created_at: string
  disabled: boolean
}

interface NewUserForm {
  email: string
  display_name: string
  role: 'admin' | 'asesor'
}

const EMPTY_FORM: NewUserForm = {
  email: '', display_name: '', role: 'asesor',
}

interface Props {
  onNavigate: (mod: 'solicitudes' | 'usuarios') => void
}

// ── Modal crear usuario ───────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm]           = useState<NewUserForm>(EMPTY_FORM)
  const [errors, setErrors]       = useState<Partial<NewUserForm>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const set = <K extends keyof NewUserForm>(key: K, value: NewUserForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const validate = () => {
    const e: Partial<NewUserForm> = {}
    if (!form.display_name.trim()) e.display_name = 'El nombre es obligatorio.'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Ingresa un correo válido.'
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
            role: form.role,
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
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Nuevo usuario</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {submitError && <Alert variant="error">{submitError}</Alert>}

          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-sm text-indigo-700 dark:text-indigo-300">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Se enviará un correo de invitación. El usuario configurará su contraseña al aceptar.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nombre completo" required htmlFor="cn_name" error={errors.display_name}>
              <Input id="cn_name" type="text" value={form.display_name}
                onChange={e => set('display_name', e.target.value)}
                placeholder="Ej. María García" error={!!errors.display_name} />
            </FormField>
            <FormField label="Rol" required htmlFor="cn_role">
              <Select id="cn_role" value={form.role} onChange={e => set('role', e.target.value as 'admin' | 'asesor')}>
                <option value="asesor">Asesor</option>
                <option value="admin">Administrador</option>
              </Select>
            </FormField>
            <FormField label="Correo electrónico" required htmlFor="cn_email" error={errors.email} className="sm:col-span-2">
              <Input id="cn_email" type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="usuario@empresa.com" error={!!errors.email} />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>Cancelar</Button>
            <Button type="submit" loading={submitting}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Enviar invitación
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
  const [role, setRole]               = useState<'admin' | 'asesor'>(user.role as 'admin' | 'asesor')
  const [disabled, setDisabled]       = useState(user.disabled)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const isSelf = me?.id === user.id

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) { setError('El nombre es obligatorio.'); return }
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
            role,
            display_name: displayName.trim(),
            ...(isSelf ? {} : { disabled }),
          }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al actualizar.')
      onSaved({ display_name: displayName.trim(), role, disabled: isSelf ? user.disabled : disabled })
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
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Editar usuario</h2>
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

          <FormField label="Rol" required htmlFor="ed_role">
            <Select id="ed_role" value={role} onChange={e => setRole(e.target.value as 'admin' | 'asesor')}>
              <option value="asesor">Asesor</option>
              <option value="admin">Administrador</option>
            </Select>
          </FormField>

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
const roleBadge = (role: string) =>
  role === 'admin'
    ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">Admin</span>
    : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-400">Asesor</span>

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

  const fmtDate = (ts: string) => new Date(ts).toLocaleDateString('es-CO', { dateStyle: 'medium' })

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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Usuarios</h1>
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-800/40">
                    {['Usuario', 'Correo', 'Rol', 'Estado', 'Fecha registro', 'Acciones'].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
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
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{u.email}</td>
                      <td className="px-4 py-3.5">{roleBadge(u.role)}</td>
                      <td className="px-4 py-3.5">{statusBadge(u.disabled)}</td>
                      <td className="px-4 py-3.5 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">{fmtDate(u.created_at)}</td>
                      <td className="px-4 py-3.5">
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
                    {roleBadge(u.role)}
                  </div>
                  <div className="flex items-center gap-2 mt-1 mb-3 pl-12">
                    {statusBadge(u.disabled)}
                    <span className="text-xs text-slate-400 dark:text-slate-500">· Desde {fmtDate(u.created_at)}</span>
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
