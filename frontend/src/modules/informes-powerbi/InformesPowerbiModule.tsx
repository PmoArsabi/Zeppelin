import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useAuth } from '@/context/AuthContext'
import type { NavigateFn } from '@/modules/types'
import InformesPowerbiListPage from './pages/InformesPowerbiListPage'
import InformesPowerbiAdminPage from './pages/InformesPowerbiAdminPage'

interface Props {
  onNavigate: NavigateFn
}

type Tab = 'informes' | 'administrar'

export default function InformesPowerbiModule({ onNavigate }: Props) {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('informes')

  return (
    <AppShell activeModule="informes-powerbi" onNavigate={onNavigate}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {isAdmin && (
          <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-800">
            {([
              { id: 'informes', label: 'Informes' },
              { id: 'administrar', label: 'Administrar' },
            ] as const).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                  tab === t.id
                    ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {tab === 'informes' || !isAdmin ? <InformesPowerbiListPage /> : <InformesPowerbiAdminPage />}
      </div>
    </AppShell>
  )
}
