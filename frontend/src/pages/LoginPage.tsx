import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import FormField from '../components/ui/FormField'
import PageTitle from '../components/ui/PageTitle'
import { BrandLogo } from '../components/brand/BrandMark'

type Mode = 'login' | 'recovery'

export default function LoginPage() {
  const { theme, toggle } = useTheme()
  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [message, setMessage]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setMessage(null)
    setPassword('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.functions.invoke('request-password-reset', {
          body: { email },
        })
        if (error) throw error
        setMessage('Enlace enviado. Revisa tu bandeja de entrada.')
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Error desconocido'
      setError(raw === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : raw)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page relative min-h-screen flex items-center justify-center px-4 py-12 transition-colors duration-300 overflow-hidden">

      {/* Theme toggle */}
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
        {/* Card */}
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-gray-800
                        shadow-xl shadow-slate-300/40 dark:shadow-black/40 p-8">

          <div className="flex flex-col items-center justify-center gap-3 mb-7 text-center">
            <BrandLogo size="md" className="shrink-0" />
            <div className="min-w-0">
              <PageTitle className="text-center">
                {mode === 'login' ? 'Bienvenido' : 'Recuperar contraseña'}
              </PageTitle>
              {mode === 'recovery' && (
                <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
                  Te enviaremos un enlace de recuperación.
                </p>
              )}
            </div>
          </div>

          {mode === 'recovery' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400
                         hover:text-slate-900 dark:hover:text-white transition-colors mb-7"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al inicio de sesión
            </button>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <FormField label="Correo electrónico" required htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                required
              />
            </FormField>

            {mode === 'login' && (
              <FormField label="Contraseña" required htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </FormField>
            )}

            {error   && <Alert variant="error">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}

            <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
              {mode === 'login' ? 'Iniciar sesión' : 'Enviar enlace'}
            </Button>
          </form>

          {mode === 'login' && (
            <p className="text-center mt-5 text-sm text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={() => switchMode('recovery')}
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline underline-offset-2"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </p>
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
