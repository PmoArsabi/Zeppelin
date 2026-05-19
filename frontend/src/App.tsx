import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import SolicitudPage from './pages/SolicitudPage'
import SolicitudesListPage from './pages/SolicitudesListPage'

type View = 'list' | 'new' | 'edit'

// Tipo mínimo que necesita el formulario de edición
export interface SolicitudEdit {
  id: string
  fecha: string
  localizador: string
  cliente: string
  asesor: string
  ciudad: string | null
  tiquetes: boolean
  hoteles: boolean
  transportes: boolean
  asistencia: boolean
  otros: boolean
  detalle_otros: string | null
  estado: string
  tipo: string
  modalidad: string
  observaciones: string | null
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#111827]">
      <div className="w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [view, setView] = useState<View>('list')
  const [editTarget, setEditTarget] = useState<SolicitudEdit | null>(null)

  if (loading) return <Spinner />
  if (!user)   return <LoginPage />

  if (view === 'list') {
    return (
      <SolicitudesListPage
        onNew={() => { setEditTarget(null); setView('new') }}
        onEdit={s => { setEditTarget(s); setView('edit') }}
      />
    )
  }

  return (
    <SolicitudPage
      editTarget={editTarget}
      onSaved={() => setView('list')}
      onCancel={() => setView('list')}
    />
  )
}
