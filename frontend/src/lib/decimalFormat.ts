/** Formato numérico es-CO: miles con punto y decimales con coma (ej. 1.500.241,01) */

export function parseDecimalCO(value: string): number | null {
  const t = value.trim()
  if (!t) return null
  const normalized = t.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export function formatDecimalCO(
  value: number | string | null | undefined,
  maxDecimals = 2
): string {
  if (value == null || value === '') return ''
  const n = typeof value === 'number' ? value : parseDecimalCO(String(value))
  if (n == null || !Number.isFinite(n)) return ''
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(n)
}

/** Aplica máscara mientras el usuario escribe */
export function maskDecimalCOInput(raw: string): string {
  const endsWithComma = raw.endsWith(',')
  let s = raw.replace(/[^\d,]/g, '')
  const firstComma = s.indexOf(',')
  if (firstComma >= 0) {
    s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, '')
  }

  const commaIdx = s.indexOf(',')
  let intPart = (commaIdx >= 0 ? s.slice(0, commaIdx) : s).replace(/\D/g, '')
  const decPart = commaIdx >= 0 ? s.slice(commaIdx + 1).replace(/\D/g, '').slice(0, 2) : ''

  if (!intPart && (decPart || endsWithComma)) intPart = '0'
  if (intPart.length > 1) intPart = intPart.replace(/^0+/, '')

  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  if (commaIdx >= 0 || endsWithComma) {
    if (endsWithComma && !decPart) return `${formattedInt},`
    return `${formattedInt},${decPart}`
  }
  return formattedInt
}
