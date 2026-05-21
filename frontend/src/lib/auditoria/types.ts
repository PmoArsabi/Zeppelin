import type { ModuleId } from '@/modules/types'

/** Módulos con auditoría de edición habilitada */
export type ModuloAuditoria = Extract<ModuleId, 'solicitudes-corporativos' | 'solicitudes-mice'>

export const MODULO_AUDITORIA_LABELS: Record<ModuloAuditoria, string> = {
  'solicitudes-mice': 'Solicitud MICE',
  'solicitudes-corporativos': 'Solicitud Corp',
}

export interface LogAuditoriaEntry {
  id: string
  modulo: ModuloAuditoria
  id_registro: string
  user_id: string
  autor_nombre: string | null
  fecha_actualizacion: string
  observacion: string
}

export interface CampoAuditoria<T> {
  etiqueta: string
  valor: (obj: T) => unknown
  formato?: (v: unknown) => string
}
