import type { ComponentType, ReactNode } from 'react'
import type { UserRole, UnidadSlug } from '@/context/AuthContext'

/** Identificador único de cada módulo de la app */
export type ModuleId = 'solicitudes-corporativos' | 'solicitudes-mice' | 'kpi-mice' | 'usuarios' | 'roles-permisos'

export type NavigateFn = (moduleId: ModuleId) => void

export interface ModuleNavItem {
  id: ModuleId
  label: string
  icon: ReactNode
  allowedRoles?: UserRole[]
  unidad?: UnidadSlug
}

export interface ModuleDefinition {
  id: ModuleId
  label: string
  icon: ReactNode
  /** Roles que pueden acceder. Undefined = todos los autenticados. */
  allowedRoles?: UserRole[]
  /** Unidad de negocio requerida para acceder. Admin ignora esto. */
  unidad?: UnidadSlug
  /** Módulo por defecto al iniciar sesión */
  default?: boolean
  component: ComponentType<{ onNavigate: NavigateFn }>
}

export interface ModuleHostProps {
  activeModule: ModuleId
  onNavigate: NavigateFn
  instanceKey?: number
}
