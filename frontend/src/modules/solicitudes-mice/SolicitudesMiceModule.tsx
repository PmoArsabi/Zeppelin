import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import type { NavigateFn } from '@/modules/types'
import type { SolicitudMiceRow } from './types'
import SolicitudesMiceListPage from './pages/SolicitudesMiceListPage'
import SolicitudMiceFormPage from './pages/SolicitudMiceFormPage'

type MainView = 'list' | 'new' | 'edit' | 'view'

interface Props {
  onNavigate: NavigateFn
}

export default function SolicitudesMiceModule({ onNavigate }: Props) {
  const [view, setView]           = useState<MainView>('list')
  const [editTarget, setEditTarget] = useState<SolicitudMiceRow | null>(null)

  if (view !== 'list') {
    return (
      <AppShell activeModule="solicitudes-mice" onNavigate={onNavigate}>
        <SolicitudMiceFormPage
          editTarget={editTarget}
          readOnly={view === 'view'}
          onSaved={() => setView('list')}
          onCancel={() => setView('list')}
        />
      </AppShell>
    )
  }

  return (
    <AppShell activeModule="solicitudes-mice" onNavigate={onNavigate}>
      <SolicitudesMiceListPage
        onNew={() => { setEditTarget(null); setView('new') }}
        onEdit={row => { setEditTarget(row); setView('edit') }}
        onView={row => { setEditTarget(row); setView('view') }}
      />
    </AppShell>
  )
}
