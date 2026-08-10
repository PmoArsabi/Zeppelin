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
  clienteProvisionalNombreById?: Map<number, string>
  profileNombreById?: Map<string, string>
}

/** IDs en BD → nombres para listados y filtros */
export function enrichMiceRowDisplay(
  row: SolicitudMiceRowDb,
  catalog: MiceCatalogos,
  ctx: MiceEnrichContext = {}
): SolicitudMiceRow {
  const clienteMap = ctx.clienteNombreById ?? new Map<number, string>()
  const clienteProvisionalMap = ctx.clienteProvisionalNombreById ?? new Map<number, string>()
  const profileMap = ctx.profileNombreById ?? new Map<string, string>()
  const clienteNombre =
    row.cliente_id === 0 && row.cliente_provisional_id != null
      ? `${clienteProvisionalMap.get(row.cliente_provisional_id) ?? 'Cliente'} (provisional)`
      : resolveClienteNombre(row.cliente_id, clienteMap, null)
  return {
    ...row,
    sector: resolveSectorNombre(row.sector_id, catalog, null),
    probabilidad: resolveProbabilidadNombre(row.probabilidad_id, catalog, null),
    cliente: clienteNombre,
    estado: resolveEstadoNombre(row.estado_id, catalog, null) as SolicitudMiceRow['estado'],
    responsable_nombre: profileMap.get(row.responsable_id) ?? '',
    tiqueteador_asignado: row.tiqueteador_user_id
      ? profileMap.get(row.tiqueteador_user_id) ?? null
      : null,
  }
}
