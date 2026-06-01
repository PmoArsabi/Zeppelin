/**
 * Lógica de etapas del proceso MICE basada en el código del estado.
 *
 * Orden del flujo:
 *   en_cotizacion → cotizacion_enviada → seguimiento → en_operacion → en_cierre → cerrado
 *
 * Estados terminales (sin avance): no_adjudicado, cancelado, cerrado
 */

export type EtapaMice =
  | 'en_cotizacion'
  | 'cotizacion_enviada'
  | 'seguimiento'
  | 'en_operacion'
  | 'en_cierre'
  | 'cerrado'
  | 'no_adjudicado'
  | 'cancelado'

const ORDEN_FLUJO: EtapaMice[] = [
  'en_cotizacion',
  'cotizacion_enviada',
  'seguimiento',
  'en_operacion',
  'en_cierre',
  'cerrado',
]

export function codigoToEtapa(codigo: string): EtapaMice | null {
  const normalized = codigo.trim().toLowerCase()
  const map: Record<string, EtapaMice> = {
    en_cotizacion: 'en_cotizacion',
    cotizacion_enviada: 'cotizacion_enviada',
    seguimiento: 'seguimiento',
    en_operacion: 'en_operacion',
    en_cierre: 'en_cierre',
    cerrado: 'cerrado',
    no_adjudicado: 'no_adjudicado',
    cancelado: 'cancelado',
  }
  return map[normalized] ?? null
}

export function siguienteEtapa(etapa: EtapaMice): EtapaMice | null {
  const idx = ORDEN_FLUJO.indexOf(etapa)
  if (idx === -1 || idx === ORDEN_FLUJO.length - 1) return null
  return ORDEN_FLUJO[idx + 1]
}

export function labelEtapa(etapa: EtapaMice): string {
  const labels: Record<EtapaMice, string> = {
    en_cotizacion: 'En cotización',
    cotizacion_enviada: 'Cotización enviada',
    seguimiento: 'Seguimiento',
    en_operacion: 'En operación',
    en_cierre: 'En cierre',
    cerrado: 'Cerrado',
    no_adjudicado: 'No adjudicado',
    cancelado: 'Cancelado',
  }
  return labels[etapa]
}

/** Etapa 1: solo secciones 1 y 2. Sin cotización. */
export function estaEnEtapa1(etapa: EtapaMice | null): boolean {
  return etapa === 'en_cotizacion'
}

/** Desde cotizacion_enviada en adelante se muestra la sección Cotización. */
export function mostrarSeccionCotizacion(etapa: EtapaMice | null): boolean {
  if (!etapa) return false
  return ['cotizacion_enviada', 'seguimiento', 'en_operacion', 'en_cierre', 'cerrado', 'no_adjudicado', 'cancelado'].includes(etapa)
}

/** Desde en_operacion en adelante se muestran campos de valor final y utilidad real. */
export function mostrarSeccionOperacion(etapa: EtapaMice | null): boolean {
  if (!etapa) return false
  return ['en_operacion', 'en_cierre', 'cerrado'].includes(etapa)
}

/** El formulario es de solo lectura cuando está cerrado, no adjudicado o cancelado. */
export function esEstadoSoloLectura(etapa: EtapaMice | null): boolean {
  return etapa === 'cerrado' || etapa === 'no_adjudicado' || etapa === 'cancelado'
}

/** El estado tiene avance de etapa disponible (botón "Avanzar"). */
export function puedeAvanzar(etapa: EtapaMice | null): boolean {
  if (!etapa) return false
  return siguienteEtapa(etapa) !== null
}
