import { supabase } from '@/lib/supabase'

export interface FacturaAnticipoEstado {
  existe: boolean
  tieneLineaElegible: boolean
  anticipo: boolean
}

/**
 * Consulta el estado de anticipo de facturas contra raw.xmart_informe_acumulado_bks,
 * cruzando producto con raw.xmart_clasificacion_producto (aplica_venta='SI').
 */
export async function fetchFacturasAnticipo(
  numeros: string[]
): Promise<{ data: Map<string, FacturaAnticipoEstado>; error: string | null }> {
  const map = new Map<string, FacturaAnticipoEstado>()
  if (numeros.length === 0) return { data: map, error: null }

  const { data, error } = await supabase.rpc('mice_get_facturas_anticipo', { numeros })
  if (error) return { data: map, error: error.message }

  for (const row of (data ?? []) as {
    factura: string
    existe: boolean
    tiene_linea_elegible: boolean
    anticipo: boolean
  }[]) {
    map.set(row.factura, {
      existe: row.existe,
      tieneLineaElegible: row.tiene_linea_elegible,
      anticipo: row.anticipo,
    })
  }
  return { data: map, error: null }
}

/**
 * Marca (o desmarca) como anticipo las líneas elegibles de una factura.
 * Falla si la factura no existe o no tiene ninguna línea con producto clasificado como venta.
 * Al liberar (anticipo=false) se requiere observacion no vacía.
 */
export async function setFacturaAnticipo(
  numero: string,
  anticipo: boolean,
  autor: string,
  observacion?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('mice_set_factura_anticipo', {
    p_factura: numero,
    p_anticipo: anticipo,
    p_autor: autor,
    p_observacion: observacion ?? null,
  })
  return { error: error?.message ?? null }
}
