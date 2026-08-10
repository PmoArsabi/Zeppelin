import { supabase } from '@/lib/supabase'

export interface ClienteProvisionalMice {
  id: number
  nombre: string
}

const RAW_SCHEMA = 'raw'
const TABLE = 'clientes_provisional_mice'

/** Crea un cliente provisional MICE. Requiere permiso 'crear' en unidad 'mice' (RLS lo exige). */
export async function crearClienteProvisionalMice(
  nombre: string,
  userId: string
): Promise<{ data: ClienteProvisionalMice | null; error: string | null }> {
  const nombreTrim = nombre.trim()
  if (!nombreTrim) return { data: null, error: 'El nombre del cliente es obligatorio.' }

  const { data, error } = await supabase
    .schema(RAW_SCHEMA)
    .from(TABLE)
    .insert({ nombre: nombreTrim, created_by: userId })
    .select('id_provisional, nombre')
    .single()

  if (error) return { data: null, error: error.message }
  const row = data as { id_provisional: number; nombre: string }
  return { data: { id: row.id_provisional, nombre: row.nombre }, error: null }
}

/** Búsqueda server-side por nombre (para el buscador combinado del selector de cliente). */
export async function searchClientesProvisionalesMice(query: string, limit = 10): Promise<{
  data: ClienteProvisionalMice[]
  error: string | null
}> {
  const q = query.trim()
  let req = supabase.schema(RAW_SCHEMA).from(TABLE).select('id_provisional, nombre').order('nombre').limit(limit)
  if (q) req = req.ilike('nombre', `%${q}%`)

  const { data, error } = await req
  if (error) return { data: [], error: error.message }
  const rows = (data ?? []) as { id_provisional: number; nombre: string }[]
  return { data: rows.map(r => ({ id: r.id_provisional, nombre: r.nombre })), error: null }
}

/** Carga un cliente provisional por ID (para resolver el seleccionado cuando no está en la lista). */
export async function fetchClienteProvisionalById(id: number): Promise<ClienteProvisionalMice | null> {
  const { data, error } = await supabase
    .schema(RAW_SCHEMA)
    .from(TABLE)
    .select('id_provisional, nombre')
    .eq('id_provisional', id)
    .single()

  if (error || !data) return null
  const row = data as { id_provisional: number; nombre: string }
  return { id: row.id_provisional, nombre: row.nombre }
}

/** Carga clientes provisionales por una lista de IDs (para resolver nombres en listados). */
export async function fetchClientesProvisionalesByIds(
  ids: number[]
): Promise<{ data: ClienteProvisionalMice[]; error: string | null }> {
  const unicos = Array.from(new Set(ids.filter(id => Number.isFinite(id))))
  if (unicos.length === 0) return { data: [], error: null }

  const { data, error } = await supabase
    .schema(RAW_SCHEMA)
    .from(TABLE)
    .select('id_provisional, nombre')
    .in('id_provisional', unicos)

  if (error) return { data: [], error: error.message }
  const rows = (data ?? []) as { id_provisional: number; nombre: string }[]
  return { data: rows.map(r => ({ id: r.id_provisional, nombre: r.nombre })), error: null }
}

export function buildClienteProvisionalNombreById(catalog: ClienteProvisionalMice[]): Map<number, string> {
  return new Map(catalog.map(c => [c.id, c.nombre]))
}
