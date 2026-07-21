import { supabase } from '@/lib/supabase'

export interface FacturaDetalleItem {
  factura: string
  fecha: string | null
  codcliente: string | null
  nomcliente: string | null
  producto: string | null
  totalConTa: number
}

export interface FacturaAnticipoEstado {
  existe: boolean
  tieneLineaElegible: boolean
  anticipo: boolean
  totalConTa: number | null
  codClientes: string[]
  detalle: FacturaDetalleItem[]
}

function normalizarCodigoCliente(codigo: string | number): string {
  const texto = String(codigo).trim()
  return /^\d+$/.test(texto) ? String(Number(texto)) : texto.toUpperCase()
}

export function facturaCorrespondeCliente(
  estado: FacturaAnticipoEstado,
  clienteId: number | null
): boolean {
  if (!estado.existe || clienteId == null) return true
  const esperado = normalizarCodigoCliente(clienteId)
  return estado.codClientes.length > 0
    && estado.codClientes.every(codigo => normalizarCodigoCliente(codigo) === esperado)
}

/**
 * Consulta el estado de anticipo de facturas contra raw.xmart_informe_acumulado_bks,
 * cruzando producto con raw.xmart_clasificacion_producto (aplica_venta='SI'),
 * e incluye la suma de total_con_ta por factura.
 */
export async function fetchFacturasAnticipo(
  numeros: string[]
): Promise<{ data: Map<string, FacturaAnticipoEstado>; error: string | null }> {
  const map = new Map<string, FacturaAnticipoEstado>()
  if (numeros.length === 0) return { data: map, error: null }

  const { data, error } = await supabase.rpc('mice_get_facturas_anticipo_detalle', { numeros })
  if (error) return { data: map, error: error.message }

  for (const row of (data ?? []) as {
    factura: string
    existe: boolean
    tiene_linea_elegible: boolean
    anticipo: boolean
    total_con_ta: number | string | null
    codclientes: string[] | null
    detalle: {
      factura: string
      fecha: string | null
      codcliente: string | number | null
      nomcliente: string | null
      producto: string | null
      total_con_ta: number | string | null
    }[] | null
  }[]) {
    map.set(row.factura, {
      existe: row.existe,
      tieneLineaElegible: row.tiene_linea_elegible,
      anticipo: row.anticipo,
      totalConTa: row.total_con_ta == null ? null : Number(row.total_con_ta),
      codClientes: (row.codclientes ?? []).map(String),
      detalle: (row.detalle ?? []).map(item => ({
        factura: item.factura,
        fecha: item.fecha,
        codcliente: item.codcliente == null ? null : String(item.codcliente),
        nomcliente: item.nomcliente,
        producto: item.producto,
        totalConTa: Number(item.total_con_ta ?? 0),
      })),
    })
  }
  return { data: map, error: null }
}

/**
 * Marca una factura como exclusión tipo anticipo (excluir_venta=true, tipo_exclusion='anticipo').
 * Desde MICE solo se puede marcar; liberar es exclusivo del módulo Facturas Excluidas.
 */
export async function setFacturaAnticipo(
  numero: string,
  anticipo: boolean,
  autor: string,
  observacion?: string
): Promise<{ error: string | null }> {
  if (!anticipo) {
    return { error: 'La liberación de facturas solo puede hacerse desde el módulo Facturas Excluidas.' }
  }

  const { error } = await supabase.rpc('mice_set_factura_exclusion', {
    p_factura: numero,
    p_excluir: true,
    p_tipo: 'anticipo',
    p_autor: autor,
    p_observacion: observacion?.trim() || 'Se excluyó como anticipo desde MICE',
  })
  return { error: error?.message ?? null }
}
