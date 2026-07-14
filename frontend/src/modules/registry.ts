import type { ModuleDefinition, ModuleId, ModuleNavItem } from './types'
import type { UserRole, UnidadSlug } from '@/context/AuthContext'
import { solicitudesCorporativosModule } from './solicitudes-corporativos'
import { solicitudesMiceModule } from './solicitudes-mice'
import { usuariosModule } from './usuarios'
import { rolesPermisosModule } from './roles-permisos'
import { cargaSiigoModule } from './carga-siigo'
import { anticiposModule } from './anticipos'

/** Registro de módulos — agregar aquí cada módulo nuevo */
export const MODULES: ModuleDefinition[] = [
  solicitudesCorporativosModule,
  solicitudesMiceModule,
  cargaSiigoModule,
  anticiposModule,
  usuariosModule,
  rolesPermisosModule,
]

export function getModule(id: ModuleId): ModuleDefinition | undefined {
  return MODULES.find(m => m.id === id)
}

export function roleCanAccess(mod: ModuleDefinition, role: UserRole, unidades: UnidadSlug[]): boolean {
  if (mod.allowedRoles && !mod.allowedRoles.includes(role)) return false
  if (mod.unidad && role !== 'admin' && !unidades.includes(mod.unidad)) return false
  return true
}

export function getNavItems(role: UserRole, unidades: UnidadSlug[]): ModuleNavItem[] {
  return MODULES
    .filter(m => roleCanAccess(m, role, unidades))
    .map(({ id, label, icon, allowedRoles, unidad }) => ({ id, label, icon, allowedRoles, unidad }))
}

export function canAccessModule(id: ModuleId, role: UserRole, unidades: UnidadSlug[]): boolean {
  const mod = getModule(id)
  if (!mod) return false
  return roleCanAccess(mod, role, unidades)
}
