/**
 * Servicio independiente para sincronizar `td_presupuesto` (tabla desnormalizada
 * aniomes/unidad/valor) a partir de los datos de `th_siigo_presupuesto`.
 *
 * Está desacoplado de `cargaSiigoService.ts` — se puede activar o eliminar
 * sin tocar la lógica principal de carga Siigo.
 *
 * Mapeo de columnas:
 *   corp       → unidad 'CORPORATIVO'
 *   total_mice → unidad 'GRUPOS'  (mice_ganado + mice_nuevos)
 */

import { supabase } from '@/lib/supabase'
import type { FilaPresupuesto } from '../types/siigo'

interface FilaPresupuestoDenorm {
  aniomes: number
  unidad: 'CORPORATIVO' | 'GRUPOS'
  valor: number
  updated_by: string
}

function buildAniomes(anio: number, mes: number): number {
  return anio * 100 + mes
}

function buildFilasDenorm(
  anio: number,
  filas: FilaPresupuesto[],
  userId: string
): FilaPresupuestoDenorm[] {
  const result: FilaPresupuestoDenorm[] = []

  for (const f of filas) {
    const aniomes = buildAniomes(anio, f.mes)

    if (f.corp !== null && f.corp !== undefined) {
      result.push({ aniomes, unidad: 'CORPORATIVO', valor: f.corp, updated_by: userId })
    }

    const totalMice = (f.mice_ganado ?? 0) + (f.mice_nuevos ?? 0)
    result.push({ aniomes, unidad: 'GRUPOS', valor: totalMice, updated_by: userId })
  }

  return result
}

/**
 * Sincroniza `td_presupuesto` para el año dado usando UPSERT por (aniomes, unidad).
 * Llamar después de una carga exitosa de tipo 'presupuesto'.
 *
 * Retorna el número de filas upserted o el error.
 */
export async function sincronizarPresupuestoDenorm(
  anio: number,
  filas: FilaPresupuesto[],
  userId: string
): Promise<{ upserted: number; error: string | null }> {
  const payload = buildFilasDenorm(anio, filas, userId)

  if (payload.length === 0) return { upserted: 0, error: null }

  const { error } = await supabase
    .from('td_presupuesto')
    .upsert(payload, { onConflict: 'aniomes,unidad' })

  if (error) return { upserted: 0, error: error.message }

  return { upserted: payload.length, error: null }
}
