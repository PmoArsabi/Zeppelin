import { supabase } from '@/lib/supabase'
import type { TipoDocumentoSiigo, FilaSiigo } from '../types/siigo'

const TABLA: Record<TipoDocumentoSiigo, string> = {
  cuentas_pagar:   'th_siigo_cuentas_pagar',
  cuentas_cobrar:  'th_siigo_cuentas_cobrar',
  ingresos_gastos: 'th_siigo_ingresos_gastos',
}

export async function existenDatosMes(
  tipo: TipoDocumentoSiigo,
  mes: number,
  anio: number
): Promise<boolean> {
  const { count } = await supabase
    .from(TABLA[tipo])
    .select('id', { count: 'exact', head: true })
    .eq('mes', mes)
    .eq('anio', anio)
  return (count ?? 0) > 0
}

export async function cargarSiigo(
  tipo: TipoDocumentoSiigo,
  mes: number,
  anio: number,
  filas: FilaSiigo[],
  userId: string
): Promise<{ insertadas: number; sobreescribio: boolean; error: string | null }> {

  const tabla = TABLA[tipo]
  let sobreescribio = false

  // 1. Verificar si hay datos previos para ese mes/año
  const hayPrevios = await existenDatosMes(tipo, mes, anio)

  if (hayPrevios) {
    // 2. Eliminar registros previos del mismo mes/año
    const { error: delError } = await supabase
      .from(tabla)
      .delete()
      .eq('mes', mes)
      .eq('anio', anio)
    if (delError) return { insertadas: 0, sobreescribio: false, error: delError.message }
    sobreescribio = true
  }

  // 3. Insertar en lotes de 500 para no sobrecargar
  const LOTE = 500
  const payload = filas.map(f => ({ ...f, mes, anio, uploaded_by: userId }))
  let insertadas = 0

  for (let i = 0; i < payload.length; i += LOTE) {
    const lote = payload.slice(i, i + LOTE)
    const { error: insError } = await supabase.from(tabla).insert(lote)
    if (insError) return { insertadas, sobreescribio, error: insError.message }
    insertadas += lote.length
  }

  // 4. Registrar en log
  await supabase.from('th_siigo_log_cargas').insert({
    tipo_documento:   tipo,
    mes,
    anio,
    filas_insertadas: insertadas,
    filas_ignoradas:  0,
    sobreescribio,
    uploaded_by:      userId,
  })

  return { insertadas, sobreescribio, error: null }
}

export async function fetchLogCargas() {
  const { data, error } = await supabase
    .from('th_siigo_log_cargas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}
