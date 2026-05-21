import type { ModuleDefinition, ModuleId, ModuleNavItem } from './types'
import { solicitudesCorporativosModule } from './solicitudes-corporativos'
import { solicitudesMiceModule } from './solicitudes-mice'
import { usuariosModule } from './usuarios'

/** Registro de módulos — agregar aquí cada módulo nuevo */
export const MODULES: ModuleDefinition[] = [
  solicitudesCorporativosModule,
  solicitudesMiceModule,
  usuariosModule,
]

export const DEFAULT_MODULE_ID: ModuleId =
  MODULES.find(m => m.default)?.id ?? MODULES[0].id

export function getModule(id: ModuleId): ModuleDefinition | undefined {
  return MODULES.find(m => m.id === id)
}

export function getDefaultModule(): ModuleDefinition {
  return getModule(DEFAULT_MODULE_ID) ?? MODULES[0]
}

export function getNavItems(isAdmin: boolean): ModuleNavItem[] {
  return MODULES
    .filter(m => !m.adminOnly || isAdmin)
    .map(({ id, label, icon, adminOnly }) => ({ id, label, icon, adminOnly }))
}

export function canAccessModule(id: ModuleId, isAdmin: boolean): boolean {
  const mod = getModule(id)
  if (!mod) return false
  return !mod.adminOnly || isAdmin
}
