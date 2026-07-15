import { supabase } from '@/lib/supabase'

function esErrorTimeout(message: string): boolean {
  return /statement timeout|canceling statement/i.test(message)
}

/**
 * Reintenta la llamada si falla por timeout (cold cache en la BD).
 * Mitigación temporal mientras se revisa el tier/recursos de Postgres.
 */
async function conReintentoPorTimeout<T>(
  llamada: () => Promise<{ data: T; error: string | null }>,
  intentos = 2
): Promise<{ data: T; error: string | null }> {
  let ultimo: { data: T; error: string | null } | null = null
  for (let i = 0; i <= intentos; i++) {
    const resultado = await llamada()
    if (!resultado.error || !esErrorTimeout(resultado.error)) return resultado
    ultimo = resultado
  }
  return ultimo!
}

export interface AnticipoRow {
  fecha: string | null
  nomofiventa: string | null
  nomcliente: string | null
  factura: string
  producto: string | null
  nompasajeros: string | null
  observacion_fact: string | null
  descripcion_item: string | null
  total_con_impuestos: number
}

export async function fetchAnticipos(): Promise<{ data: AnticipoRow[]; error: string | null }> {
  return conReintentoPorTimeout(async () => {
    const { data, error } = await supabase.rpc('anticipos_listado')
    if (error) return { data: [], error: error.message }
    return { data: (data ?? []) as AnticipoRow[], error: null }
  })
}

export async function liberarAnticipo(
  factura: string,
  autor: string,
  observacion: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('mice_set_factura_anticipo', {
    p_factura: factura,
    p_anticipo: false,
    p_autor: autor,
    p_observacion: observacion,
  })
  return { error: error?.message ?? null }
}

export interface FacturaBusquedaResult {
  factura: string
  tiene_linea_elegible: boolean
  anticipo: boolean
}

export async function buscarFactura(texto: string): Promise<{ data: FacturaBusquedaResult[]; error: string | null }> {
  return conReintentoPorTimeout(async () => {
    const { data, error } = await supabase.rpc('anticipos_buscar_factura', { p_texto: texto })
    if (error) return { data: [], error: error.message }
    return { data: (data ?? []) as FacturaBusquedaResult[], error: null }
  })
}

export async function marcarAnticipo(factura: string, autor: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('mice_set_factura_anticipo', {
    p_factura: factura,
    p_anticipo: true,
    p_autor: autor,
  })
  return { error: error?.message ?? null }
}
