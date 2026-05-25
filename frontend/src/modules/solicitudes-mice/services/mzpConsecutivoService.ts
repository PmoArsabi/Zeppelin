import { supabase } from '@/lib/supabase'
import {
  formatMzpFromNumber,
  MZP_NUM_MAX,
  MZP_NUM_MIN,
  parseMzpNumber,
} from '@/lib/mzpFormat'

const CONFIG_TABLE = 'td_config'
const CONFIG_KEY = 'mzp_consecutivo_inicio'
const SOLICITUD_TABLE = 'th_solicitud_mice'

function clampInicio(n: number): number {
  return Math.min(MZP_NUM_MAX, Math.max(MZP_NUM_MIN, Math.floor(n)))
}

/** Lee el consecutivo inicial desde `td_config` (clave `mzp_consecutivo_inicio`). */
export async function fetchMzpConsecutivoInicio(): Promise<{
  value: number
  error: string | null
}> {
  const { data, error } = await supabase
    .from(CONFIG_TABLE)
    .select('valor')
    .eq('clave', CONFIG_KEY)
    .maybeSingle()

  if (error) {
    return { value: MZP_NUM_MIN, error: error.message }
  }

  if (data?.valor != null) {
    const n = parseInt(String(data.valor), 10)
    if (Number.isFinite(n)) {
      return { value: clampInicio(n), error: null }
    }
  }

  return { value: MZP_NUM_MIN, error: null }
}

async function fetchMaxMzpNumberInDb(): Promise<{ max: number; error: string | null }> {
  const { data, error } = await supabase.from(SOLICITUD_TABLE).select('mzp')
  if (error) return { max: 0, error: error.message }

  let max = 0
  for (const row of data ?? []) {
    const n = parseMzpNumber((row as { mzp: string | null }).mzp)
    if (n != null && n > max) max = n
  }
  return { max, error: null }
}

/** Próximo MZP: max(último en th_solicitud_mice, td_config.mzp_consecutivo_inicio − 1) + 1 */
export async function resolveNextMzpCode(): Promise<{
  code: string
  numero: number
  error: string | null
}> {
  const [inicioRes, maxRes] = await Promise.all([
    fetchMzpConsecutivoInicio(),
    fetchMaxMzpNumberInDb(),
  ])

  if (maxRes.error) {
    return { code: '', numero: 0, error: maxRes.error }
  }

  const nextNum = Math.max(maxRes.max, inicioRes.value - 1) + 1
  if (nextNum > MZP_NUM_MAX) {
    return {
      code: '',
      numero: 0,
      error: `Se alcanzó el máximo de consecutivo (${MZP_NUM_MAX}).`,
    }
  }

  return {
    code: formatMzpFromNumber(nextNum),
    numero: nextNum,
    error: inicioRes.error,
  }
}
