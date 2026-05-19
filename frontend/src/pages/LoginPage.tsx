import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import FormField from '../components/ui/FormField'

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
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#111827] px-4 py-12 transition-colors duration-300">

      {/* Theme toggle */}
      <button
        onClick={toggle}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        className="fixed top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl
                   bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700
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

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/25 mb-5">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {mode === 'login' ? 'Bienvenido' : 'Recuperar contraseña'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            {mode === 'login' ? 'Ingresa con tu cuenta.' : 'Te enviaremos un enlace de recuperación.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200 dark:border-gray-800
                        shadow-xl shadow-slate-200/50 dark:shadow-black/30 p-8">

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

        <p className="text-center mt-6 text-xs text-slate-400 dark:text-gray-600">
          Zeppelin © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
