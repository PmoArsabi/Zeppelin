import { supabase } from '@/lib/supabase'
import type { SeguimientoCorpEntry } from '../types/seguimiento-corp'

const TABLE = 'solicitud_seguimientos'

export function formatSeguimientoCorpError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find')) {
    return (
      'La tabla de seguimientos no está disponible. En Supabase → SQL Editor ejecute ' +
      'database/migrations/008_solicitud_corp_seguimiento.sql. ' +
      'Luego Settings → API → Reload schema y recargue esta página (F5).'
    )
  }
  if (m.includes('permission denied') || m.includes('row-level security')) {
    return 'Sin permiso para ver seguimientos. Debe ser el responsable de la solicitud o administrador.'
  }
  return message
}

export async function listSeguimientosCorp(
  solicitudId: string
): Promise<{ data: SeguimientoCorpEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, solicitud_id, user_id, autor_nombre, mensaje, created_at')
    .eq('solicitud_id', solicitudId)
    .order('created_at', { ascending: true })

  if (error) return { data: [], error: formatSeguimientoCorpError(error.message) }
  return { data: (data ?? []) as SeguimientoCorpEntry[], error: null }
}

export async function addSeguimientoCorp(
  solicitudId: string,
  userId: string,
  autorNombre: string,
  mensaje: string
): Promise<{ data: SeguimientoCorpEntry | null; error: string | null }> {
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

  if (error) return { data: null, error: formatSeguimientoCorpError(error.message) }
  return { data: data as SeguimientoCorpEntry, error: null }
}
