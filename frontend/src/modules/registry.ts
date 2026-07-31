import type { ModuleDefinition, ModuleId, ModuleNavItem } from './types'
import type { UnidadSlug } from '@/context/AuthContext'
import { solicitudesCorporativosModule } from './solicitudes-corporativos'
import { solicitudesMiceModule } from './solicitudes-mice'
import { usuariosModule } from './usuarios'
import { rolesPermisosModule } from './roles-permisos'
import { cargaSiigoModule } from './carga-siigo'
import { anticiposModule } from './anticipos'
import { informesPowerbiModule } from './informes-powerbi'

/** Registro de módulos — agregar aquí cada módulo nuevo */
export const MODULES: ModuleDefinition[] = [
  solicitudesCorporativosModule,
  solicitudesMiceModule,
  cargaSiigoModule,
  anticiposModule,
  informesPowerbiModule,
  usuariosModule,
  rolesPermisosModule,
]

export function getModule(id: ModuleId): ModuleDefinition | undefined {
  return MODULES.find(m => m.id === id)
}

export function roleCanAccess(
  mod: ModuleDefinition,
  isAdmin: boolean,
  unidades: UnidadSlug[],
  hasPowerbiInformes: boolean,
): boolean {
  if (isAdmin) return true
  if (mod.adminOnly) return false
  if (mod.requiresPowerbiInformes && !hasPowerbiInformes) return false
  if (mod.unidad && !unidades.includes(mod.unidad)) return false
  return true
}

export function getNavItems(isAdmin: boolean, unidades: UnidadSlug[], hasPowerbiInformes: boolean): ModuleNavItem[] {
  return MODULES
    .filter(m => roleCanAccess(m, isAdmin, unidades, hasPowerbiInformes))
    .map(({ id, label, icon, adminOnly, unidad, requiresPowerbiInformes }) => ({ id, label, icon, adminOnly, unidad, requiresPowerbiInformes }))
}

export function canAccessModule(
  id: ModuleId,
  isAdmin: boolean,
  unidades: UnidadSlug[],
  hasPowerbiInformes: boolean,
): boolean {
  const mod = getModule(id)
  if (!mod) return false
  return roleCanAccess(mod, isAdmin, unidades, hasPowerbiInformes)
}
