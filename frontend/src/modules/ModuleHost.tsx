import { useAuth } from '@/context/AuthContext'
import { canAccessModule, getModule, getNavItems } from './registry'
import type { ModuleHostProps } from './types'
import { MODULES } from './registry'

/** Renderiza el módulo activo; redirige al primer módulo accesible si no hay permiso */
export default function ModuleHost({ activeModule, onNavigate, instanceKey = 0 }: ModuleHostProps) {
  const { role } = useAuth()

  const accessibleDefault = () => {
    const navItems = getNavItems(role)
    const firstId = navItems[0]?.id
    return firstId ? getModule(firstId) : MODULES[0]
  }

  const mod = canAccessModule(activeModule, role)
    ? getModule(activeModule)
    : accessibleDefault()

  if (!mod) return null

  const Component = mod.component
  return <Component key={`${mod.id}-${instanceKey}`} onNavigate={onNavigate} />
}
