import { supabase } from '@/lib/supabase'
import type { TipoDocumentoSiigo, FilaSiigo, FilaPresupuesto } from '../types/siigo'

const TABLA: Record<TipoDocumentoSiigo, string> = {
  cuentas_pagar:   'th_siigo_cuentas_pagar',
  cuentas_cobrar:  'th_siigo_cuentas_cobrar',
  ingresos_gastos: 'th_siigo_ingresos_gastos',
  presupuesto:     'th_siigo_presupuesto',
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

  // 3. Preparar payload según tipo (ingresos_gastos no tiene nit/sucursal/dig_verificacion)
  const esIngresosGastos = tipo === 'ingresos_gastos'
  const LOTE = 500
  const payload = filas.map(f => {
    const base = {
      mes, anio, uploaded_by: userId,
      grupo: f.grupo, cuenta: f.cuenta, subcuenta: f.subcuenta,
      auxiliar: f.auxiliar, subauxil: f.subauxil,
      descripcion: f.descripcion, ult_mov: f.ult_mov,
      saldo_anterior: f.saldo_anterior, debitos: f.debitos,
      creditos: f.creditos, nuevo_saldo: f.nuevo_saldo,
    }
    if (esIngresosGastos) return base
    return { ...base, nit: f.nit, sucursal: f.sucursal, dig_verificacion: f.dig_verificacion }
  })
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

export async function existenDatosAnio(anio: number): Promise<boolean> {
  const { count } = await supabase
    .from('th_siigo_presupuesto')
    .select('id', { count: 'exact', head: true })
    .eq('anio', anio)
  return (count ?? 0) > 0
}

export async function cargarPresupuesto(
  anio: number,
  filas: FilaPresupuesto[],
  userId: string
): Promise<{ insertadas: number; sobreescribio: boolean; error: string | null }> {
  let sobreescribio = false

  const hayPrevios = await existenDatosAnio(anio)
  if (hayPrevios) {
    const { error: delError } = await supabase
      .from('th_siigo_presupuesto')
      .delete()
      .eq('anio', anio)
    if (delError) return { insertadas: 0, sobreescribio: false, error: delError.message }
    sobreescribio = true
  }

  const payload = filas.map(f => ({
    anio,
    mes:         f.mes,
    corp:        f.corp,
    mice_ganado: f.mice_ganado,
    mice_nuevos: f.mice_nuevos,
    uploaded_by: userId,
  }))

  const { error: insError } = await supabase.from('th_siigo_presupuesto').insert(payload)
  if (insError) return { insertadas: 0, sobreescribio, error: insError.message }

  await supabase.from('th_siigo_log_cargas').insert({
    tipo_documento:   'presupuesto',
    mes:              null,
    anio,
    filas_insertadas: filas.length,
    filas_ignoradas:  0,
    sobreescribio,
    uploaded_by:      userId,
  })

  return { insertadas: filas.length, sobreescribio, error: null }
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
