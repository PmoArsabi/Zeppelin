import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import SolicitudPage from './pages/SolicitudPage'
import SolicitudesListPage from './pages/SolicitudesListPage'
import UsuariosPage from './pages/UsuariosPage'

type Module = 'solicitudes' | 'usuarios'
type SolicitudView = 'list' | 'new' | 'edit'

export interface SolicitudEdit {
  id: string
  fecha: string
  localizador: string
  cliente: string
  asesor: string
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
  status: boolean
  updated_at: string
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#111827]">
      <div className="w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const { user, loading, isAdmin }   = useAuth()
  const [module, setModule]          = useState<Module>('solicitudes')
  const [solView, setSolView]        = useState<SolicitudView>('list')
  const [editTarget, setEditTarget]  = useState<SolicitudEdit | null>(null)

  if (loading) return <Spinner />
  if (!user)   return <LoginPage />

  const navigate = (mod: Module) => {
    setModule(mod)
    setSolView('list')
  }

  if (module === 'usuarios' && isAdmin) {
    return <UsuariosPage onNavigate={navigate} />
  }

  if (solView === 'list') {
    return (
      <SolicitudesListPage
        onNew={() => { setEditTarget(null); setSolView('new') }}
        onEdit={s => { setEditTarget(s); setSolView('edit') }}
        onNavigate={navigate}
      />
    )
  }

  return (
    <SolicitudPage
      editTarget={editTarget}
      onSaved={() => setSolView('list')}
      onCancel={() => setSolView('list')}
    />
  )
}
