import { supabase } from '@/lib/supabase'
import type { LogAuditoriaEntry, ModuloAuditoria } from './types'

const TABLE = 'log_auditoria'

export function formatLogAuditoriaError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find')) {
    return (
      'La tabla log_auditoria no está disponible. Ejecute database/migrations/007_log_auditoria_generico.sql en Supabase.'
    )
  }
  if (m.includes('permission denied') || m.includes('row-level security')) {
    return 'Sin permiso para registrar o ver auditoría de este registro.'
  }
  return message
}

export async function insertLogAuditoria(
  modulo: ModuloAuditoria,
  idRegistro: string,
  userId: string,
  autorNombre: string,
  observacion: string
): Promise<{ error: string | null }> {
  const text = observacion.trim()
  if (!text) return { error: null }

  const { error } = await supabase.from(TABLE).insert({
    modulo,
    id_registro: idRegistro,
    user_id: userId,
    autor_nombre: autorNombre.trim() || null,
    observacion: text,
  })

  if (error) return { error: formatLogAuditoriaError(error.message) }
  return { error: null }
}

export async function registrarAuditoriaEdicion(
  modulo: ModuloAuditoria,
  idRegistro: string,
  userId: string,
  autorNombre: string,
  observacion: string | null
): Promise<{ warning: string | null }> {
  if (!observacion) return { warning: null }
  const { error } = await insertLogAuditoria(modulo, idRegistro, userId, autorNombre, observacion)
  return { warning: error }
}

export async function listLogAuditoria(
  modulo: ModuloAuditoria,
  idRegistro: string
): Promise<{ data: LogAuditoriaEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, modulo, id_registro, user_id, autor_nombre, fecha_actualizacion, observacion')
    .eq('modulo', modulo)
    .eq('id_registro', idRegistro)
    .order('fecha_actualizacion', { ascending: false })

  if (error) return { data: [], error: formatLogAuditoriaError(error.message) }
  return { data: (data ?? []) as LogAuditoriaEntry[], error: null }
}
