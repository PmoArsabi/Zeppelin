export const MZP_PREFIX = 'MZP'
export const MZP_SUFFIX_MAX = 3

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
