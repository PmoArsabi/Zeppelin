import { supabase } from '@/lib/supabase'
import type { SeguimientoMiceEntry } from '../types/seguimiento-mice'

const TABLE = 'th_solicitud_mice_seguimientos'

/** Mensaje claro para errores de Supabase / migración */
export function formatSeguimientoError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find')) {
    return (
      'La tabla de seguimientos no está disponible. En Supabase → SQL Editor ejecute ' +
      'database/migrations/005 y 009_nomenclatura_td_th_itd.sql. ' +
      'Luego Settings → API → Reload schema y recargue esta página (F5).'
    )
  }
  if (m.includes('permission denied') || m.includes('row-level security')) {
    return 'Sin permiso para ver seguimientos. Debe ser el responsable de la cotización o administrador.'
  }
  return message
}

export async function listSeguimientosMice(
  solicitudId: string
): Promise<{ data: SeguimientoMiceEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, solicitud_id, user_id, autor_nombre, mensaje, created_at')
    .eq('solicitud_id', solicitudId)
    .order('created_at', { ascending: true })

  if (error) return { data: [], error: formatSeguimientoError(error.message) }
  return { data: (data ?? []) as SeguimientoMiceEntry[], error: null }
}

export async function addSeguimientoMice(
  solicitudId: string,
  userId: string,
  autorNombre: string,
  mensaje: string
): Promise<{ data: SeguimientoMiceEntry | null; error: string | null }> {
  const text = mensaje.trim()
  if (!text) return { data: null, error: 'Escriba un mensaje de seguimiento.' }
  if (text.length > 2000) return { data: null, error: 'Máximo 2000 caracteres.' }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      solicitud_id: solicitudId,
      user_id: userId,
      autor_nombre: autorNombre.trim() || 'Usuario',
      mensaje: text,
    })
    .select('id, solicitud_id, user_id, autor_nombre, mensaje, created_at')
    .single()

  if (error) return { data: null, error: formatSeguimientoError(error.message) }
  return { data: data as SeguimientoMiceEntry, error: null }
}
