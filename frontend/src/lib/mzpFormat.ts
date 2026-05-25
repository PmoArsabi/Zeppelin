export const MZP_PREFIX = 'MZP'
export const MZP_SUFFIX_MAX = 3
export const MZP_NUM_MIN = 1
export const MZP_NUM_MAX = 999

export function mzpSuffix(value: string): string {
  const t = value.trim().toUpperCase()
  if (!t) return ''
  if (t.startsWith(MZP_PREFIX)) {
    return t.slice(MZP_PREFIX.length).replace(/\D/g, '').slice(0, MZP_SUFFIX_MAX)
  }
  return t.replace(/\D/g, '').slice(0, MZP_SUFFIX_MAX)
}

export function mzpFromSuffix(suffix: string): string {
  const s = suffix.replace(/\D/g, '').slice(0, MZP_SUFFIX_MAX)
  return s ? `${MZP_PREFIX}${s}` : ''
}

/** Extrae el número de un código MZP válido (ej. MZP117 → 117). */
export function parseMzpNumber(value: string | null | undefined): number | null {
  const m = value?.trim().toUpperCase().match(/^MZP(\d{1,3})$/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n >= MZP_NUM_MIN && n <= MZP_NUM_MAX ? n : null
}

export function formatMzpFromNumber(n: number): string {
  const clamped = Math.min(MZP_NUM_MAX, Math.max(MZP_NUM_MIN, Math.floor(n)))
  return `${MZP_PREFIX}${clamped}`
}
