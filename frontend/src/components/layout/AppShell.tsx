import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

type Module = 'solicitudes' | 'usuarios'

interface AppShellProps {
  children: React.ReactNode
  activeModule?: Module
  onNavigate?: (mod: Module) => void
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
  )
}

const NAV_ITEMS: { id: Module; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  {
    id: 'solicitudes',
    label: 'Solicitudes',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function AppShell({ children, activeModule = 'solicitudes', onNavigate }: AppShellProps) {
  const { user, signOut, isAdmin } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)

  const NavItem = ({ item }: { item: typeof NAV_ITEMS[number] }) => {
    const active = activeModule === item.id
    return (
      <button
        onClick={() => { onNavigate?.(item.id); setMobileOpen(false) }}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
          ${active
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white'
          }
        `}
      >
        <span className={active ? 'text-white' : 'text-slate-400 dark:text-slate-500'}>{item.icon}</span>
        {item.label}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#111827] flex overflow-x-hidden">

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 fixed top-0 left-0 h-full z-20">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-200 dark:border-gray-800 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-600/30 shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight">Zeppelin</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
            Módulos
          </p>
          {visibleItems.map(item => <NavItem key={item.id} item={item} />)}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-slate-200 dark:border-gray-800 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                {user?.email?.[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{user?.email}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
                {isAdmin ? 'Administrador' : 'Asesor'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-1">
            <ThemeToggle />
            <button
              onClick={signOut}
              className="flex-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400
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
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 flex flex-col z-40">
            <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">Zeppelin</span>
              </div>
              <button onClick={() => setMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                Módulos
              </p>
              {visibleItems.map(item => <NavItem key={item.id} item={item} />)}
            </nav>
            <div className="px-3 py-4 border-t border-slate-200 dark:border-gray-800">
              <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{user?.email}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{isAdmin ? 'Administrador' : 'Asesor'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-1">
                <ThemeToggle />
                <button onClick={signOut}
                  className="flex-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400
                             hover:text-rose-600 dark:hover:text-rose-400 transition-colors
                             px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Salir
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main content — offset por sidebar en desktop */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-56">
        {/* Top bar mobile */}
        <header className="md:hidden sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setMobileOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-white">Zeppelin</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
