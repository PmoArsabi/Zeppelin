import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import Spinner from '@/components/ui/Spinner'
import LoginPage from '@/pages/LoginPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import { isPasswordRecoveryReturn } from '@/lib/appUrl'
import { ModuleHost, type ModuleId, getNavItems } from '@/modules'

export default function App() {
  const { user, loading, isAdmin, unidades, hasPowerbiInformes, passwordRecovery } = useAuth()
  const [activeModule, setActiveModule] = useState<ModuleId | null>(null)
  const [moduleInstanceKey, setModuleInstanceKey] = useState(0)

  const handleNavigate = (id: ModuleId) => {
    setActiveModule(id)
    setModuleInstanceKey(k => k + 1)
  }

  const showResetPassword = passwordRecovery || isPasswordRecoveryReturn()

  if (loading) return <Spinner />
  if (showResetPassword) return <ResetPasswordPage />
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
