import { Suspense } from 'react'
import { useAuth } from '@/context/AuthContext'
import { canAccessModule, getModule, getNavItems, MODULES } from './registry'
import AppShell from '@/components/layout/AppShell'
import ModulePageSkeleton from '@/components/ui/ModulePageSkeleton'
import type { ModuleHostProps } from './types'

export default function ModuleHost({ activeModule, onNavigate, instanceKey = 0 }: ModuleHostProps) {
  const { role, unidades } = useAuth()

  const accessibleDefault = () => {
    const items = getNavItems(role, unidades)
    const firstId = items[0]?.id
    return firstId ? getModule(firstId) : MODULES[0]
  }

  const mod = canAccessModule(activeModule, role, unidades)
    ? getModule(activeModule)
    : accessibleDefault()

  if (!mod) return null

  const Component = mod.component
  return (
    <Suspense
      fallback={
        <AppShell activeModule={activeModule} onNavigate={onNavigate}>
          <ModulePageSkeleton />
        </AppShell>
      }
    >
      <Component key={`${mod.id}-${instanceKey}`} onNavigate={onNavigate} />
    </Suspense>
  )
}
