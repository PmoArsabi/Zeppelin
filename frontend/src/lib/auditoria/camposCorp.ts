import type { SolicitudForm } from '@/modules/solicitudes-corporativos/types'
import { buildObservacionGenerica, displayValorAuditoria, formatFechaAuditoria } from './buildObservacion'
import type { CampoAuditoria } from './types'

function fmtBool(v: unknown): string {
  if (v === null || v === undefined) return displayValorAuditoria(v)
  return v ? 'Sí' : 'No'
}

const CAMPOS_CORP: CampoAuditoria<SolicitudForm>[] = [
  { etiqueta: 'Fecha', valor: f => f.fecha, formato: formatFechaAuditoria },
  { etiqueta: 'Localizador', valor: f => f.localizador },
  { etiqueta: 'Cliente', valor: f => f.cliente },
  { etiqueta: 'Asesor', valor: f => f.asesor },
  { etiqueta: 'Tiquetes', valor: f => f.tiquetes, formato: fmtBool },
  { etiqueta: 'Hoteles', valor: f => f.hoteles, formato: fmtBool },
  { etiqueta: 'Transportes', valor: f => f.transportes, formato: fmtBool },
  { etiqueta: 'Asistencia', valor: f => f.asistencia, formato: fmtBool },
  { etiqueta: 'Otros', valor: f => f.otros, formato: fmtBool },
  { etiqueta: 'Detalle otros', valor: f => f.detalle_otros },
  { etiqueta: 'Estado', valor: f => f.estado },
  { etiqueta: 'Tipo', valor: f => f.tipo },
  { etiqueta: 'Modalidad', valor: f => f.modalidad },
]

export function buildAuditoriaCorpObservacion(
  antes: SolicitudForm,
  despues: SolicitudForm
): string | null {
  return buildObservacionGenerica(antes, despues, CAMPOS_CORP)
}
