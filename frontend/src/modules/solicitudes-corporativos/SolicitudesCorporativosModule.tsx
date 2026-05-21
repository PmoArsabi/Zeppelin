import { useState } from 'react'
import type { NavigateFn } from '@/modules/types'
import type { SolicitudEdit } from './types'
import SolicitudesListPage from '@/pages/SolicitudesListPage'
import SolicitudPage from '@/pages/SolicitudPage'

type View = 'list' | 'new' | 'edit' | 'view'

interface Props {
  onNavigate: NavigateFn
}

/** Enrutador interno del módulo: listado ↔ formulario nuevo/edición/ver */
export default function SolicitudesCorporativosModule({ onNavigate }: Props) {
  const [view, setView] = useState<View>('list')
  const [editTarget, setEditTarget] = useState<SolicitudEdit | null>(null)

  if (view === 'list') {
    return (
      <SolicitudesListPage
        onNew={() => { setEditTarget(null); setView('new') }}
        onEdit={s => { setEditTarget(s); setView('edit') }}
        onView={s => { setEditTarget(s); setView('view') }}
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <SolicitudPage
      editTarget={editTarget}
      readOnly={view === 'view'}
      onSaved={() => setView('list')}
      onCancel={() => setView('list')}
      onNavigate={onNavigate}
    />
  )
}
