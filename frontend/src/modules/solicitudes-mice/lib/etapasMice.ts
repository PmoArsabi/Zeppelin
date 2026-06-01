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
  // Normalizar: minúsculas, espacios → guion bajo, quitar acentos básicos
  const normalized = codigo.trim().toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/é/g, 'e').replace(/á/g, 'a').replace(/í/g, 'i')

  const map: Record<string, EtapaMice> = {
    en_cotizacion: 'en_cotizacion',
    cotizacion_enviada: 'cotizacion_enviada',
    // variantes de nombre largo
    'cotizacion_enviada_-_cotizacion_como_datos_obligatorios': 'cotizacion_enviada',
    seguimiento: 'seguimiento',
    en_operacion: 'en_operacion',
    en_cierre: 'en_cierre',
    cerrado: 'cerrado',
    no_adjudicado: 'no_adjudicado',
    'no_adjudicado_-no_ganado': 'no_adjudicado',
    'no_ganado': 'no_adjudicado',
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

/**
 * Muestra la sección Cotización desde cotizacion_enviada en adelante,
 * O cuando la etapa siguiente es cotizacion_enviada (para rellenar antes de avanzar).
 */
export function mostrarSeccionCotizacion(etapa: EtapaMice | null): boolean {
  if (!etapa) return false
  if (['cotizacion_enviada', 'seguimiento', 'en_operacion', 'en_cierre', 'cerrado', 'no_adjudicado', 'cancelado'].includes(etapa)) return true
  return siguienteEtapa(etapa) === 'cotizacion_enviada'
}

/**
 * Muestra la sección "En operación" cuando la etapa actual ES en_operacion o posterior,
 * O cuando la etapa siguiente es en_operacion (para que el usuario pueda llenar los campos antes de avanzar).
 */
export function mostrarSeccionOperacion(etapa: EtapaMice | null): boolean {
  if (!etapa) return false
  if (['en_operacion', 'en_cierre', 'cerrado'].includes(etapa)) return true
  return siguienteEtapa(etapa) === 'en_operacion'
}

/** El formulario es de solo lectura cuando está cerrado, no adjudicado o cancelado. */
export function esEstadoSoloLectura(etapa: EtapaMice | null): boolean {
  return etapa === 'cerrado' || etapa === 'no_adjudicado' || etapa === 'cancelado'
}

/**
 * Muestra la sección Cierre (facturas y recibos de caja) cuando la etapa actual
 * ES en_cierre o cerrado, O cuando la siguiente etapa es en_cierre (para rellenar antes de avanzar).
 */
export function mostrarSeccionCierre(etapa: EtapaMice | null): boolean {
  if (!etapa) return false
  if (['en_cierre', 'cerrado'].includes(etapa)) return true
  return siguienteEtapa(etapa) === 'en_cierre'
}

/** El estado tiene avance de etapa disponible (botón "Avanzar"). */
export function puedeAvanzar(etapa: EtapaMice | null): boolean {
  if (!etapa) return false
  return siguienteEtapa(etapa) !== null
}
