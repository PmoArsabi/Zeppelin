import { useState } from 'react'
import type { NavigateFn } from '@/modules/types'
import type { SolicitudMiceRow } from './types'
import SolicitudesMiceListPage from './pages/SolicitudesMiceListPage'
import SolicitudMiceFormPage from './pages/SolicitudMiceFormPage'

type View = 'list' | 'new' | 'edit' | 'view'

interface Props {
  onNavigate: NavigateFn
}

export default function SolicitudesMiceModule({ onNavigate }: Props) {
  const [view, setView] = useState<View>('list')
  const [editTarget, setEditTarget] = useState<SolicitudMiceRow | null>(null)

  if (view === 'list') {
    return (
      <SolicitudesMiceListPage
        onNew={() => { setEditTarget(null); setView('new') }}
        onEdit={row => { setEditTarget(row); setView('edit') }}
        onView={row => { setEditTarget(row); setView('view') }}
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <SolicitudMiceFormPage
      editTarget={editTarget}
      readOnly={view === 'view'}
      onSaved={() => setView('list')}
      onCancel={() => setView('list')}
      onNavigate={onNavigate}
    />
  )
}
