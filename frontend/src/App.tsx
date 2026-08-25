import { useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Spinner from '@/components/ui/Spinner'
import LoginPage from '@/pages/LoginPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import { isPasswordRecoveryReturn } from '@/lib/appUrl'
import { ModuleHost, type ModuleId, getNavItems } from '@/modules'

function MainApp() {
  const { user, loading, isAdmin, unidades, hasPowerbiInformes, passwordRecovery } = useAuth()
  const location = useLocation()
  const [activeModule, setActiveModule] = useState<ModuleId | null>(null)
  const [moduleInstanceKey, setModuleInstanceKey] = useState(0)

  if (passwordRecovery || isPasswordRecoveryReturn()) {
    return <Navigate to={`/reset-password${location.hash}`} replace />
  }

  const handleNavigate = (id: ModuleId) => {
    setActiveModule(id)
    setModuleInstanceKey(k => k + 1)
  }

  if (loading) return <Spinner />
  if (!user) return <LoginPage />

  const firstAccessible = getNavItems(isAdmin, unidades, hasPowerbiInformes)[0]?.id ?? 'solicitudes-mice'
  const resolvedModule = (activeModule ?? firstAccessible) as ModuleId

  return (
    <ModuleHost
      activeModule={resolvedModule}
      onNavigate={handleNavigate}
      instanceKey={moduleInstanceKey}
    />
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  )
}
