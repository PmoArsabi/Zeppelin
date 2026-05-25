import {
  resolveEstadoNombre,
  resolveProbabilidadNombre,
  resolveSectorNombre,
} from './miceCatalogResolve'
import { resolveClienteNombre } from '@/lib/clientes'
import type { MiceCatalogos } from '../types/mice-catalogos'
import type { SolicitudMiceRow, SolicitudMiceRowDb } from '../types'

export type MiceEnrichContext = {
  clienteNombreById?: Map<number, string>
  profileNombreById?: Map<string, string>
}

/** IDs en BD → nombres para listados y filtros */
export function enrichMiceRowDisplay(
  row: SolicitudMiceRowDb,
  catalog: MiceCatalogos,
  ctx: MiceEnrichContext = {}
): SolicitudMiceRow {
  const clienteMap = ctx.clienteNombreById ?? new Map<number, string>()
  const profileMap = ctx.profileNombreById ?? new Map<string, string>()
  return {
    ...row,
    sector: resolveSectorNombre(row.sector_id, catalog, null),
    probabilidad: resolveProbabilidadNombre(row.probabilidad_id, catalog, null),
    cliente: resolveClienteNombre(row.cliente_id, clienteMap, null),
    estado: resolveEstadoNombre(row.estado_id, catalog, null) as SolicitudMiceRow['estado'],
    responsable_nombre: profileMap.get(row.responsable_id) ?? '',
    tiqueteador_asignado: row.tiqueteador_user_id
      ? profileMap.get(row.tiqueteador_user_id) ?? null
      : null,
  }
}
