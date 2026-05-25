import type { ModuleDefinition, ModuleId, ModuleNavItem } from './types'
import type { UserRole } from '@/context/AuthContext'
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

export function roleCanAccess(mod: ModuleDefinition, role: UserRole): boolean {
  if (!mod.allowedRoles) return true
  return mod.allowedRoles.includes(role)
}

export function getNavItems(role: UserRole): ModuleNavItem[] {
  return MODULES
    .filter(m => roleCanAccess(m, role))
    .map(({ id, label, icon, allowedRoles }) => ({ id, label, icon, allowedRoles }))
}

export function canAccessModule(id: ModuleId, role: UserRole): boolean {
  const mod = getModule(id)
  if (!mod) return false
  return roleCanAccess(mod, role)
}

/** @deprecated usa canAccessModule(id, role) */
export function canAccessModuleLegacy(id: ModuleId, isAdmin: boolean): boolean {
  return canAccessModule(id, isAdmin ? 'admin' : 'asesor_mice')
}
