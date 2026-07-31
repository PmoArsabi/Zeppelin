import { supabase } from '@/lib/supabase'

export interface InformePowerbi {
  id: string
  nombre: string
  descripcion: string | null
  link: string
  imagen: string | null
}

export interface InformePowerbiAcceso {
  unidad_slug: string
  rol_slug: string
}

export interface InformePowerbiAdmin extends InformePowerbi {
  created_at: string
  updated_at: string
  accesos: InformePowerbiAcceso[]
}

export async function fetchMisInformes(): Promise<{ data: InformePowerbi[]; error: string | null }> {
  const { data, error } = await supabase.rpc('powerbi_get_mis_informes')
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as InformePowerbi[], error: null }
}

export async function fetchInformesAdmin(): Promise<{ data: InformePowerbiAdmin[]; error: string | null }> {
  const { data, error } = await supabase.rpc('powerbi_admin_list_informes')
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as InformePowerbiAdmin[], error: null }
}

export async function saveInforme(input: {
  id: string | null
  nombre: string
  descripcion: string
  link: string
  imagen: string
  accesos: InformePowerbiAcceso[]
}): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('powerbi_admin_upsert_informe', {
    p_id: input.id,
    p_nombre: input.nombre,
    p_descripcion: input.descripcion,
    p_link: input.link,
    p_imagen: input.imagen,
    p_accesos: input.accesos,
  })
  return { error: error?.message ?? null }
}

export async function deleteInforme(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('powerbi_admin_delete_informe', { p_id: id })
  return { error: error?.message ?? null }
}
