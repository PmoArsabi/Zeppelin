import type { ComponentType, ReactNode } from 'react'
import type { UnidadSlug } from '@/context/AuthContext'

/** Identificador único de cada módulo de la app */
export type ModuleId = 'solicitudes-corporativos' | 'solicitudes-mice' | 'usuarios' | 'roles-permisos' | 'carga-siigo' | 'anticipos' | 'informes-powerbi'

export type NavigateFn = (moduleId: ModuleId) => void

export interface ModuleNavItem {
  id: ModuleId
  label: string
  icon: ReactNode
  /** true = solo administradores globales (independiente de rolesPorUnidad) */
  adminOnly?: boolean
  unidad?: UnidadSlug
  /** true = visible solo si el usuario tiene al menos un informe de PowerBI asignado (o es admin) */
  requiresPowerbiInformes?: boolean
}

export interface ModuleDefinition {
  id: ModuleId
  label: string
  icon: ReactNode
  /** true = solo administradores globales pueden acceder. */
  adminOnly?: boolean
  /** Unidad de negocio requerida para acceder: el usuario necesita un rol asignado en esa unidad. Admin ignora esto. */
  unidad?: UnidadSlug
  /** true = visible solo si el usuario tiene al menos un informe de PowerBI asignado (o es admin) */
  requiresPowerbiInformes?: boolean
  /** Módulo por defecto al iniciar sesión */
  default?: boolean
  component: ComponentType<{ onNavigate: NavigateFn }>
}

export interface ModuleHostProps {
  activeModule: ModuleId
  onNavigate: NavigateFn
  instanceKey?: number
}
