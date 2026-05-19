import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

interface AppShellProps {
  children: React.ReactNode
  /** Tabs de navegación opcionales */
  nav?: React.ReactNode
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400
                 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60
                 transition-colors"
    >
      {theme === 'dark' ? (
        /* Sol */
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ) : (
        /* Luna */
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}

export default function AppShell({ children, nav }: AppShellProps) {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#111827] flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-600/30">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight">Zeppelin</span>
          </div>

          {/* Nav central */}
          {nav && <div className="flex-1 flex justify-center">{nav}</div>}

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="w-px h-5 bg-slate-200 dark:bg-gray-700 mx-1" />
            <div className="hidden sm:flex items-center gap-2 mr-1">
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  {user?.email?.[0].toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 max-w-36 truncate">
                {user?.email}
              </span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400
                         hover:text-rose-600 dark:hover:text-rose-400 transition-colors
                         px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  )
}
