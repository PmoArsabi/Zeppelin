import type { ServicioMiceCatalogo } from '../types/mice-catalogos'

const SEP = ' | '

export function serviciosToDb(servicios: string[]): string | null {
  return servicios.length > 0 ? servicios.join(SEP) : null
}

export function dbToServicios(
  value: string | null | undefined,
  catalogo?: ServicioMiceCatalogo[]
): string[] {
  const v = (value ?? '').trim()
  if (!v) return []
  const ids = new Set(catalogo?.map(s => s.id) ?? [])
  const byLabel = new Map(
    (catalogo ?? []).map(s => [s.label.toLowerCase(), s.id] as const)
  )
  const parsed: string[] = []
  for (const part of v.split(SEP).map(s => s.trim()).filter(Boolean)) {
    if (ids.has(part) && !parsed.includes(part)) {
      parsed.push(part)
      continue
    }
    const byId = catalogo?.find(s => s.id === part)
    if (byId && !parsed.includes(byId.id)) {
      parsed.push(byId.id)
      continue
    }
    const idFromLabel = byLabel.get(part.toLowerCase())
    if (idFromLabel && !parsed.includes(idFromLabel)) parsed.push(idFromLabel)
  }
  return parsed
}

/** Resumen con + (ej. Tiquetes + Alojamiento + Traslados) */
export function formatServiciosResumen(
  servicios: string[],
  catalogo?: ServicioMiceCatalogo[]
): string {
  if (servicios.length === 0) return ''
  return servicios
    .map(id => catalogo?.find(s => s.id === id)?.label ?? id)
    .join(' + ')
}

/** Texto legible para listados */
export function formatServiciosLabel(
  servicios: string[],
  catalogo?: ServicioMiceCatalogo[]
): string {
  if (servicios.length === 0) return '—'
  return formatServiciosResumen(servicios, catalogo)
}
