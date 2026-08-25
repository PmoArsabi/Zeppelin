import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { leaveResetPasswordPath } from '../lib/appUrl'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import FormField from '../components/ui/FormField'
import PageTitle from '../components/ui/PageTitle'
import { BrandLogo } from '../components/brand/BrandMark'

const MIN_PASSWORD_LENGTH = 8

export default function ResetPasswordPage() {
  const { theme, toggle } = useTheme()
  const { user, session, clearPasswordRecovery } = useAuth()
  const [ready, setReady] = useState(() => Boolean(user || session))
  const [linkError, setLinkError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user || session) {
      setReady(true)
      setLinkError(null)
      return
    }

    let resolved = false

    const markReady = () => {
      resolved = true
      setReady(true)
      setLinkError(null)
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY' || nextSession) markReady()
    })

    const timeout = window.setTimeout(() => {
      if (!resolved) {
        setLinkError('El enlace no es válido o ya expiró. Solicita uno nuevo desde el inicio de sesión.')
      }
    }, 4000)

    return () => {
      subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  }, [user, session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setMessage('Contraseña actualizada. Entrando…')
      leaveResetPasswordPath()
      clearPasswordRecovery()
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Error desconocido'
      setError(raw)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page relative min-h-screen flex items-center justify-center px-4 py-12 transition-colors duration-300 overflow-hidden">
      <button
        onClick={toggle}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        className="fixed top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-xl
                   bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-slate-200 dark:border-gray-700
                   text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white
                   shadow-sm transition-colors"
      >
        {theme === 'dark' ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-gray-800
                        shadow-xl shadow-slate-300/40 dark:shadow-black/40 p-8">
          <div className="flex flex-col items-center justify-center gap-3 mb-7 text-center">
            <BrandLogo size="md" className="shrink-0" />
            <div className="min-w-0">
              <PageTitle className="text-center">Nueva contraseña</PageTitle>
              <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
                Elige una contraseña nueva para tu cuenta.
              </p>
            </div>
          </div>

          {linkError && <Alert variant="error">{linkError}</Alert>}

          {!linkError && !ready && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">Validando enlace…</p>
          )}

          {!linkError && ready && (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <FormField label="Nueva contraseña" required htmlFor="new-password">
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </FormField>

              <FormField label="Confirmar contraseña" required htmlFor="confirm-password">
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </FormField>

              {error && <Alert variant="error">{error}</Alert>}
              {message && <Alert variant="success">{message}</Alert>}

              <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
                Guardar contraseña
              </Button>
            </form>
          )}
        </div>

        <p className="login-page__footer text-center mt-6 text-xs flex flex-col items-center gap-2">
          <BrandLogo size="sm" className="opacity-85" />
          <span>© {new Date().getFullYear()} Viajes Zeppelin</span>
        </p>
      </div>
    </div>
  )
}
