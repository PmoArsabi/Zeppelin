import { formatSectorNombre } from './formatSectorMice'
import type { MiceCatalogos } from '../types/mice-catalogos'

function norm(s: string): string {
  return s.trim().toLowerCase()
}

const ESTADO_NOMBRE_ALIASES: Record<string, string> = {
  'no ganado': 'no adjudicado - no ganado',
  'no adjudicado -no ganado': 'no adjudicado - no ganado',
}

export function isEstadoIdValid(estadoId: number | null | undefined, catalog: MiceCatalogos): boolean {
  if (estadoId == null) return false
  return catalog.estados.some(e => e.id === estadoId)
}

export function isProbabilidadIdValid(probabilidadId: number | null | undefined, catalog: MiceCatalogos): boolean {
  if (probabilidadId == null) return false
  return catalog.probabilidades.some(p => p.id === probabilidadId)
}

export function pickEstadoIdForSave(
  estadoId: number | null,
  estadoNombre: string,
  catalog: MiceCatalogos
): number | null {
  if (estadoId != null && isEstadoIdValid(estadoId, catalog)) return estadoId
  return resolveEstadoId(estadoNombre, catalog)
}

export function pickProbabilidadIdForSave(
  probabilidadId: number | null,
  probabilidadNombre: string,
  catalog: MiceCatalogos
): number | null {
  if (probabilidadId != null && isProbabilidadIdValid(probabilidadId, catalog)) return probabilidadId
  if (!probabilidadNombre.trim()) return null
  return resolveProbabilidadId(probabilidadNombre, catalog)
}

export function resolveProbabilidadIdFromLegacy(
  probabilidadId: number | null | undefined,
  legacyCodigo: string | null | undefined,
  legacyNombre: string | null | undefined,
  catalog: MiceCatalogos
): number | null {
  if (probabilidadId != null && isProbabilidadIdValid(probabilidadId, catalog)) return probabilidadId
  const c = legacyCodigo?.trim()
  if (c) {
    const byCodigo = catalog.probabilidadIdByCodigo.get(c) ?? catalog.probabilidadIdByCodigo.get(norm(c))
    if (byCodigo != null) return byCodigo
  }
  if (legacyNombre?.trim()) return resolveProbabilidadId(legacyNombre, catalog)
  return null
}

export function resolveEstadoId(estadoNombre: string, catalog: MiceCatalogos): number | null {
  const n = estadoNombre.trim()
  if (!n) return null
  const alias = ESTADO_NOMBRE_ALIASES[norm(n)]
  const lookup = alias ?? n
  const byNombre = catalog.estadoIdByNombre.get(norm(lookup))
  if (byNombre != null) return byNombre
  const exact = catalog.estados.find(e => norm(e.nombre) === norm(lookup))
  return exact?.id ?? null
}

/** Fila legacy con estado_codigo texto en BD */
export function resolveEstadoIdFromLegacy(
  estadoId: number | null | undefined,
  legacyCodigo: string | null | undefined,
  legacyNombre: string | null | undefined,
  catalog: MiceCatalogos
): number | null {
  if (estadoId != null && isEstadoIdValid(estadoId, catalog)) return estadoId
  const c = legacyCodigo?.trim()
  if (c) {
    const byCodigo = catalog.estadoIdByCodigo.get(c) ?? catalog.estadoIdByCodigo.get(norm(c))
    if (byCodigo != null) return byCodigo
    const match = catalog.estados.find(
      e => norm(e.codigo) === norm(c) || norm(e.nombre) === norm(c)
    )
    if (match) return match.id
  }
  if (legacyNombre?.trim()) return resolveEstadoId(legacyNombre, catalog)
  return null
}

export function resolveEstadoNombre(
  estadoId: number | null | undefined,
  catalog: MiceCatalogos,
  fallbackNombre?: string | null
): string {
  if (estadoId != null) {
    const nombre = catalog.estadoNombreById.get(estadoId)
    if (nombre) return nombre
  }
  return fallbackNombre?.trim() ?? ''
}

export function resolveProbabilidadId(nombre: string, catalog: MiceCatalogos): number | null {
  const n = nombre.trim()
  if (!n) return null
  const byNombre = catalog.probabilidadIdByNombre.get(norm(n))
  if (byNombre != null) return byNombre
  const exact = catalog.probabilidades.find(p => norm(p.nombre) === norm(n))
  return exact?.id ?? null
}

export function resolveProbabilidadNombre(
  probabilidadId: number | null | undefined,
  catalog: MiceCatalogos,
  fallbackNombre?: string | null
): string {
  if (probabilidadId != null) {
    const nombre = catalog.probabilidadNombreById.get(probabilidadId)
    if (nombre) return nombre
  }
  return fallbackNombre?.trim() ?? ''
}

export function resolveSectorId(sectorNombre: string, catalog: MiceCatalogos): number | null {
  const formatted = formatSectorNombre(sectorNombre)
  if (!formatted) return null
  const id = catalog.sectorIdByNombre.get(norm(formatted))
  if (id != null) return id
  for (const s of catalog.sectores) {
    if (norm(formatSectorNombre(s.nombre)) === norm(formatted)) return s.id
  }
  return null
}

export function resolveSectorNombre(
  sectorId: number | null | undefined,
  catalog: MiceCatalogos,
  fallbackNombre?: string | null
): string {
  if (sectorId != null) {
    const nombre = catalog.sectorNombreById.get(sectorId)
    if (nombre) return formatSectorNombre(nombre)
  }
  return fallbackNombre ? formatSectorNombre(fallbackNombre) : ''
}
