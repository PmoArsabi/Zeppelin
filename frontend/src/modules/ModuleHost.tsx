import { useAuth } from '@/context/AuthContext'
import { canAccessModule, getDefaultModule, getModule } from './registry'
import type { ModuleHostProps } from './types'

/** Renderiza el módulo activo; redirige al default si no hay permiso */
export default function ModuleHost({ activeModule, onNavigate, instanceKey = 0 }: ModuleHostProps) {
  const { role } = useAuth()
  const mod = canAccessModule(activeModule, role)
    ? getModule(activeModule)
    : getDefaultModule()

  if (!mod) return null

  const Component = mod.component
  return <Component key={`${mod.id}-${instanceKey}`} onNavigate={onNavigate} />
}
