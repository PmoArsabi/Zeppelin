import { supabase } from '@/lib/supabase'

export interface ClienteOption {
  value: string
  label: string
}

const RAW_SCHEMA = 'raw'
const CLIENTES_TABLE = 'xmart_clientes_zeppelin'

/** Lista de clientes desde raw.xmart_clientes_zeppelin (campo fullname) */
export async function fetchClientesZeppelin(): Promise<{
  data: ClienteOption[]
  error: string | null
}> {
  const { data, error } = await supabase
    .schema(RAW_SCHEMA)
    .from(CLIENTES_TABLE)
    .select('fullname')
    .order('fullname')

  if (error) {
    return { data: [], error: error.message }
  }

  const seen = new Set<string>()
  const options: ClienteOption[] = []

  for (const row of data ?? []) {
    const name = String((row as { fullname: string | null }).fullname ?? '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    options.push({ value: name, label: name })
  }

  return { data: options, error: null }
}
