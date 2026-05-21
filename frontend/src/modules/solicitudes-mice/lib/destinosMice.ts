import type { DestinoMice } from '../types'

const SEP = ' | '

/** Guarda pares alineados en las columnas texto del Excel (PAIS / CIUDAD) */
export function destinosToDbColumns(destinos: DestinoMice[]): {
  pais_destino: string | null
  ciudad_destino: string | null
} {
  const valid = destinos.filter(d => d.pais.trim())
  if (valid.length === 0) return { pais_destino: null, ciudad_destino: null }
  return {
    pais_destino: valid.map(d => d.pais.trim()).join(SEP),
    ciudad_destino: valid.map(d => d.ciudad.trim()).join(SEP),
  }
}

export function dbColumnsToDestinos(
  pais: string | null | undefined,
  ciudad: string | null | undefined
): DestinoMice[] {
  const p = (pais ?? '').trim()
  if (!p) return []
  if (!p.includes(SEP)) {
    return [{ pais: p, ciudad: (ciudad ?? '').trim() }]
  }
  const paises = p.split(SEP).map(s => s.trim()).filter(Boolean)
  const ciudades = (ciudad ?? '').split(SEP).map(s => s.trim())
  return paises.map((paisNombre, i) => ({
    pais: paisNombre,
    ciudad: ciudades[i] ?? '',
  }))
}

/** Texto legible para listados */
export function formatDestinosLabel(destinos: DestinoMice[]): string {
  if (destinos.length === 0) return '—'
  return destinos
    .map(d => (d.ciudad ? `${d.pais} — ${d.ciudad}` : d.pais))
    .join('; ')
}
