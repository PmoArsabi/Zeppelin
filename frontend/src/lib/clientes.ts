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

/** Catálogo desde raw.xmart_clientes_zeppelin */
export async function fetchClientesZeppelinCatalog(): Promise<{
  data: ClienteZeppelin[]
  error: string | null
}> {
  const { data, error } = await supabase
    .schema(RAW_SCHEMA)
    .from(CLIENTES_TABLE)
    .select('customerid, fullname')
    .order('fullname')

  if (error) {
    return { data: [], error: error.message }
  }

  const seen = new Set<number>()
  const list: ClienteZeppelin[] = []

  for (const row of data ?? []) {
    const r = row as { customerid: unknown; fullname: string | null }
    const id = parseClienteId(r.customerid)
    const fullname = String(r.fullname ?? '').trim()
    if (id == null || !fullname || seen.has(id)) continue
    seen.add(id)
    list.push({ id, fullname })
  }

  return { data: list, error: null }
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
