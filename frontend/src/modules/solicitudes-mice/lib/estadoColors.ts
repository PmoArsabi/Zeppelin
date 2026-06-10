/**
 * Colores por estado del pipeline MICE (definidos por negocio).
 * Se usan tanto en los badges de la tabla como en los KPI de resumen.
 */

interface EstadoColor {
  /** Color base (texto/ícono/borde activo) */
  hex: string
  /** Fondo suave para badges/cards (claro) */
  bg: string
  /** Fondo suave para modo oscuro */
  bgDark: string
}

const ESTADO_COLORS: Record<string, EstadoColor> = {
  'en cotizacion':        { hex: '#E74C3C', bg: '#FDECEA', bgDark: 'rgba(231,76,60,0.15)' },
  'cotizacion enviada':   { hex: '#F58220', bg: '#FEF1E6', bgDark: 'rgba(245,130,32,0.15)' },
  'seguimiento':          { hex: '#F4C542', bg: '#FEF9E7', bgDark: 'rgba(244,197,66,0.15)' },
  'en operacion':         { hex: '#1D4ED8', bg: '#E8EEFD', bgDark: 'rgba(29,78,216,0.18)' },
  'en cierre':            { hex: '#6C5CE7', bg: '#EFEDFD', bgDark: 'rgba(108,92,231,0.15)' },
  'cerrado':              { hex: '#27AE60', bg: '#E9F8EF', bgDark: 'rgba(39,174,96,0.15)' },
  'no adjudicado':        { hex: '#7F8C8D', bg: '#EEF1F1', bgDark: 'rgba(127,140,141,0.18)' },
  'no ganado':            { hex: '#7F8C8D', bg: '#EEF1F1', bgDark: 'rgba(127,140,141,0.18)' },
  'cancelado':            { hex: '#BDC3C7', bg: '#F4F5F6', bgDark: 'rgba(189,195,199,0.18)' },
}

const DEFAULT_COLOR: EstadoColor = { hex: '#94A3B8', bg: '#F1F5F9', bgDark: 'rgba(148,163,184,0.15)' }

function normEstadoKey(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
}

export function estadoColor(nombre: string): EstadoColor {
  const k = normEstadoKey(nombre)
  if (ESTADO_COLORS[k]) return ESTADO_COLORS[k]
  if (k.includes('no adjudicado') || k.includes('no ganado')) return ESTADO_COLORS['no adjudicado']
  return DEFAULT_COLOR
}
