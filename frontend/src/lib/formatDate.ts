const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/
const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

/** Fecha calendario → DD/MM/YYYY (es-CO). Acepta YYYY-MM-DD, ISO datetime o DD/MM/YYYY. */
export function formatDateDDMMYYYY(value: string | null | undefined): string {
  if (value == null || String(value).trim() === '') return '—'

  const s = String(value).trim()
  const slash = SLASH_DATE.exec(s)
  if (slash) {
    const [, d, m, y] = slash
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }

  const iso = s.slice(0, 10)
  const isoMatch = ISO_DATE.exec(iso)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return `${d}/${m}/${y}`
  }

  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, '0')
    const mm = String(parsed.getMonth() + 1).padStart(2, '0')
    const yyyy = parsed.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  return s
}

/** Fecha y hora → DD/MM/YYYY, HH:mm */
export function formatDateTimeDDMMYYYY(value: string | null | undefined): string {
  if (value == null || String(value).trim() === '') return '—'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return formatDateDDMMYYYY(value)

  const yyyy = parsed.getFullYear()
  const mm = String(parsed.getMonth() + 1).padStart(2, '0')
  const dd = String(parsed.getDate()).padStart(2, '0')
  const date = formatDateDDMMYYYY(`${yyyy}-${mm}-${dd}`)
  const time = parsed.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
}
