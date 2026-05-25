import type { ComponentType, ReactNode } from 'react'
import type { UserRole } from '@/context/AuthContext'

/** Identificador único de cada módulo de la app */
export type ModuleId = 'solicitudes-corporativos' | 'solicitudes-mice' | 'usuarios'

export type NavigateFn = (moduleId: ModuleId) => void

export interface ModuleNavItem {
  id: ModuleId
  label: string
  icon: ReactNode
  allowedRoles?: UserRole[]
}

export interface ModuleDefinition {
  id: ModuleId
  label: string
  icon: ReactNode
  /** Si se define, solo estos roles pueden acceder. Undefined = todos los autenticados. */
  allowedRoles?: UserRole[]
  /** Módulo por defecto al iniciar sesión */
  default?: boolean
  component: ComponentType<{ onNavigate: NavigateFn }>
}

export interface ModuleHostProps {
  activeModule: ModuleId
  onNavigate: NavigateFn
  /** Incrementa al elegir un módulo en el menú para volver al listado inicial */
  instanceKey?: number
}
