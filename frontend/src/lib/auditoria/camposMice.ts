import { formatDecimalCO } from '@/lib/decimalFormat'
import type { DestinoMice, SolicitudMiceForm } from '@/modules/solicitudes-mice/types'
import type { MiceCatalogos } from '@/modules/solicitudes-mice/types/mice-catalogos'
import {
  buildObservacionGenerica,
  diffListaAuditoria,
  displayValorAuditoria,
  formatFechaAuditoria,
  lineaModificado,
  VACIO_AUDITORIA,
} from './buildObservacion'
import type { CampoAuditoria } from './types'

function servicioLabel(id: string, catalog: MiceCatalogos): string {
  const s = catalog.servicios.find(x => x.id === id)
  return s ? s.label : id
}

function destinoLabel(d: DestinoMice): string {
  return `${d.pais} — ${d.ciudad}`
}

function dineroTexto(valor: string, moneda: string): string {
  const t = valor.trim()
  if (!t) return VACIO_AUDITORIA
  return `${moneda} ${formatDecimalCO(valor)}`
}

export function buildAuditoriaMiceObservacion(
  antes: SolicitudMiceForm,
  despues: SolicitudMiceForm,
  catalog: MiceCatalogos
): string | null {
  const lineas: string[] = []
  const push = (line: string | null) => {
    if (line) lineas.push(line)
  }

  const fmtFecha = (v: unknown) => formatFechaAuditoria(v)
  if (antes.cliente_id !== despues.cliente_id) {
    push(
      lineaModificado(
        'Cliente',
        antes.cliente.trim() || VACIO_AUDITORIA,
        despues.cliente.trim() || VACIO_AUDITORIA
      )
    )
  }

  if (antes.probabilidad_id !== despues.probabilidad_id) {
    push(
      lineaModificado(
        'Probabilidad',
        antes.probabilidad.trim() || VACIO_AUDITORIA,
        despues.probabilidad.trim() || VACIO_AUDITORIA
      )
    )
  }

  if (antes.estado_id !== despues.estado_id) {
    push(
      lineaModificado(
        'Estado',
        antes.estado.trim() || VACIO_AUDITORIA,
        despues.estado.trim() || VACIO_AUDITORIA
      )
    )
  }

  const campos: CampoAuditoria<SolicitudMiceForm>[] = [
    { etiqueta: 'Año', valor: f => f.anio },
    { etiqueta: 'Responsable', valor: f => f.responsable_nombre },
    { etiqueta: 'Sector', valor: f => f.sector },
    { etiqueta: 'MZP', valor: f => f.mzp },
    { etiqueta: 'Nombre', valor: f => f.nombre },
    { etiqueta: 'Fecha inicio', valor: f => f.inicio, formato: fmtFecha },
    { etiqueta: 'Fecha fin', valor: f => f.fin, formato: fmtFecha },
    { etiqueta: 'Fecha solicitud', valor: f => f.fecha_solicitud, formato: fmtFecha },
    { etiqueta: 'Fecha entrega', valor: f => f.fecha_entrega, formato: fmtFecha },
    { etiqueta: 'PAX', valor: f => f.pax },
  ]

  const base = buildObservacionGenerica(antes, despues, campos)
  if (base) lineas.push(...base.split('\n'))

  push(lineaModificado('Valor cotizado', dineroTexto(antes.valor_cotizado, antes.moneda_cotizacion), dineroTexto(despues.valor_cotizado, despues.moneda_cotizacion)))

  if (antes.moneda_cotizacion !== despues.moneda_cotizacion) {
    push(
      lineaModificado(
        'Moneda cotización',
        displayValorAuditoria(antes.moneda_cotizacion),
        displayValorAuditoria(despues.moneda_cotizacion)
      )
    )
  }

  const utilAntes = antes.utilidad_proyectada.trim()
    ? `${antes.moneda_cotizacion} ${formatDecimalCO(antes.utilidad_proyectada)}`
    : VACIO_AUDITORIA
  const utilDespues = despues.utilidad_proyectada.trim()
    ? `${despues.moneda_cotizacion} ${formatDecimalCO(despues.utilidad_proyectada)}`
    : VACIO_AUDITORIA
  push(lineaModificado('Utilidad proyectada', utilAntes, utilDespues))

  if (antes.tiqueteador_user_id !== despues.tiqueteador_user_id) {
    push(
      lineaModificado(
        'Tiqueteador',
        antes.tiqueteador_asignado.trim() || VACIO_AUDITORIA,
        despues.tiqueteador_asignado.trim() || VACIO_AUDITORIA
      )
    )
  }

  lineas.push(
    ...diffListaAuditoria(
      'Servicios',
      antes.servicios,
      despues.servicios,
      id => id,
      id => servicioLabel(id, catalog)
    )
  )
  lineas.push(
    ...diffListaAuditoria(
      'Lugar',
      antes.lugares,
      despues.lugares,
      nombre => nombre,
      nombre => nombre
    )
  )
  lineas.push(
    ...diffListaAuditoria(
      'Destinos',
      antes.destinos,
      despues.destinos,
      d => `${d.pais}|${d.ciudad}`,
      destinoLabel
    )
  )

  if (lineas.length === 0) return null
  return lineas.join('\n')
}
