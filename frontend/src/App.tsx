import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import Spinner from '@/components/ui/Spinner'
import LoginPage from '@/pages/LoginPage'
import { DEFAULT_MODULE_ID, ModuleHost, type ModuleId } from '@/modules'

export default function App() {
  const { user, loading } = useAuth()
  const [activeModule, setActiveModule] = useState<ModuleId>(DEFAULT_MODULE_ID)
  const [moduleInstanceKey, setModuleInstanceKey] = useState(0)

  const handleNavigate = (id: ModuleId) => {
    setActiveModule(id)
    setModuleInstanceKey(k => k + 1)
  }

  if (loading) return <Spinner />
  if (!user) return <LoginPage />

  return (
    <ModuleHost
      activeModule={activeModule}
      onNavigate={handleNavigate}
      instanceKey={moduleInstanceKey}
    />
  )
}
