import { supabase } from '@/lib/supabase'

export interface AsesorOption {
  value: string
  label: string
}

/**
 * Asesores asignables en Solicitud Corporativa: personas activas con rol asesor/coordinador
 * en la unidad Corp, o admin. Si se pasa `asesorActual`, se incluye aunque ya no cumpla esos
 * criterios (inactivo o reasignado de rol) para no perder el valor histórico del registro.
 */
export async function fetchAsesoresCorp(asesorActual?: string): Promise<{
  data: AsesorOption[]
  error: string | null
}> {
  const { data, error } = await supabase.rpc('rbac_get_asesores_corp')
  if (error) return { data: [], error: error.message }

  const nombres = new Set<string>(
    ((data ?? []) as { display_name: string }[]).map(r => r.display_name)
  )

  const actual = asesorActual?.trim()
  if (actual) nombres.add(actual)

  const options = [...nombres]
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map(nombre => ({ value: nombre, label: nombre }))

  return { data: options, error: null }
}
