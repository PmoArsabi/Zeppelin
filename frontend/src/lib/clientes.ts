import { supabase } from '@/lib/supabase'

export interface ClienteOption {
  value: string
  label: string
}

export interface ClienteZeppelin {
  id: number
  fullname: string
}

const RAW_SCHEMA = 'raw'
const CLIENTES_TABLE = 'xmart_clientes_zeppelin'

function parseClienteId(raw: unknown): number | null {
  if (raw == null) return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}

function parseClientesRows(rows: unknown[]): ClienteZeppelin[] {
  const seen = new Set<number>()
  const list: ClienteZeppelin[] = []
  for (const row of rows) {
    const r = row as { customerid: unknown; fullname: string | null }
    const id = parseClienteId(r.customerid)
    const fullname = String(r.fullname ?? '').trim()
    if (id == null || !fullname || seen.has(id)) continue
    seen.add(id)
    list.push({ id, fullname })
  }
  return list
}

/** Primeros N clientes ordenados por nombre (carga inicial del selector) */
export async function fetchClientesZeppelinCatalog(limit = 30): Promise<{
  data: ClienteZeppelin[]
  error: string | null
}> {
  const { data, error } = await supabase
    .schema(RAW_SCHEMA)
    .from(CLIENTES_TABLE)
    .select('customerid, fullname')
    .order('fullname')
    .limit(limit)

  if (error) return { data: [], error: error.message }
  return { data: parseClientesRows(data ?? []), error: null }
}

/** Búsqueda server-side por nombre (para el buscador del selector) */
export async function searchClientesZeppelin(query: string, limit = 20): Promise<{
  data: ClienteZeppelin[]
  error: string | null
}> {
  const q = query.trim()
  if (!q) return fetchClientesZeppelinCatalog(limit)

  const { data, error } = await supabase
    .schema(RAW_SCHEMA)
    .from(CLIENTES_TABLE)
    .select('customerid, fullname')
    .ilike('fullname', `%${q}%`)
    .order('fullname')
    .limit(limit)

  if (error) return { data: [], error: error.message }
  return { data: parseClientesRows(data ?? []), error: null }
}

/** Carga un cliente por ID (para resolver el seleccionado cuando no está en la lista) */
export async function fetchClienteById(id: number): Promise<ClienteZeppelin | null> {
  const { data, error } = await supabase
    .schema(RAW_SCHEMA)
    .from(CLIENTES_TABLE)
    .select('customerid, fullname')
    .eq('customerid', id)
    .single()

  if (error || !data) return null
  const r = data as { customerid: unknown; fullname: string | null }
  const parsedId = parseClienteId(r.customerid)
  const fullname = String(r.fullname ?? '').trim()
  if (parsedId == null || !fullname) return null
  return { id: parsedId, fullname }
}

export function clientesToIdOptions(catalog: ClienteZeppelin[]): ClienteOption[] {
  return catalog.map(c => ({ value: String(c.id), label: c.fullname }))
}

export function clientesToNameOptions(catalog: ClienteZeppelin[]): ClienteOption[] {
  return catalog.map(c => ({ value: c.fullname, label: c.fullname }))
}

export function buildClienteNombreById(catalog: ClienteZeppelin[]): Map<number, string> {
  return new Map(catalog.map(c => [c.id, c.fullname]))
}

export function resolveClienteNombre(
  clienteId: number | null | undefined,
  nombreById: Map<number, string>,
  fallback?: string | null
): string {
  if (clienteId != null) {
    const nombre = nombreById.get(clienteId)
    if (nombre) return nombre
    return fallback?.trim() || `#${clienteId}`
  }
  return fallback?.trim() ?? ''
}

/** Opciones por nombre (corporativos legacy). MICE usa clientesToIdOptions. */
export async function fetchClientesZeppelin(): Promise<{
  data: ClienteOption[]
  error: string | null
}> {
  const res = await fetchClientesZeppelinCatalog()
  return { data: clientesToNameOptions(res.data), error: res.error }
}
