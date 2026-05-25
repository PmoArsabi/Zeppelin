import { formatDateDDMMYYYY } from '@/lib/formatDate'
import type { CampoAuditoria } from './types'

export const VACIO_AUDITORIA = '(vacío)'

export type TipoCambioAuditoria = 'agregado' | 'eliminado' | 'modificado'

const PREF = { agregado: '[+]', eliminado: '[-]', modificado: '[~]' } as const

export function displayValorAuditoria(value: unknown): string {
  if (value == null) return VACIO_AUDITORIA
  const s = String(value).trim()
  return s || VACIO_AUDITORIA
}

/** Fecha ISO → DD/MM/YYYY */
export function formatFechaAuditoria(iso: unknown): string {
  const formatted = formatDateDDMMYYYY(iso == null ? '' : String(iso))
  return formatted === '—' ? displayValorAuditoria(iso) : formatted
}

/** Línea con prefijo para colorear en UI: [+], [-], [~] */
export function formatLineaAuditoria(
  tipo: TipoCambioAuditoria,
  texto: string
): string {
  return `${PREF[tipo]} ${texto}`
}

export function lineaAgregado(etiqueta: string, valor: string): string {
  return formatLineaAuditoria('agregado', `${etiqueta}: agregado ${valor}`)
}

export function lineaEliminado(etiqueta: string, valor: string): string {
  return formatLineaAuditoria('eliminado', `${etiqueta}: eliminado ${valor}`)
}

export function lineaModificado(etiqueta: string, antes: string, despues: string): string | null {
  if (antes === despues) return null
  if (antes === VACIO_AUDITORIA && despues !== VACIO_AUDITORIA) {
    return lineaAgregado(etiqueta, despues)
  }
  if (despues === VACIO_AUDITORIA) {
    return lineaEliminado(etiqueta, antes)
  }
  return formatLineaAuditoria('modificado', `${etiqueta}: ${antes} cambió a ${despues}`)
}

/** @deprecated use lineaModificado */
export function lineaCambio(etiqueta: string, antes: string, despues: string): string | null {
  return lineaModificado(etiqueta, antes, despues)
}

/**
 * Compara listas por clave: cada ítem agregado o quitado genera su propia línea.
 */
export function diffListaAuditoria<T>(
  etiqueta: string,
  itemsAntes: T[],
  itemsDespues: T[],
  keyFn: (item: T) => string,
  labelFn: (item: T) => string
): string[] {
  const mapA = new Map(itemsAntes.map(i => [keyFn(i), labelFn(i)]))
  const mapB = new Map(itemsDespues.map(i => [keyFn(i), labelFn(i)]))
  const lineas: string[] = []

  for (const [key, label] of mapA) {
    if (!mapB.has(key)) lineas.push(lineaEliminado(etiqueta, label))
  }
  for (const [key, label] of mapB) {
    if (!mapA.has(key)) lineas.push(lineaAgregado(etiqueta, label))
  }
  return lineas
}

export interface LineaObservacionParseada {
  tipo: TipoCambioAuditoria
  texto: string
}

export function parseLineasObservacion(observacion: string): LineaObservacionParseada[] {
  return observacion
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(linea => {
      const m = linea.match(/^\[([+~-])\]\s*(.+)$/)
      if (m) {
        const tipo: TipoCambioAuditoria =
          m[1] === '+' ? 'agregado' : m[1] === '-' ? 'eliminado' : 'modificado'
        return { tipo, texto: m[2].trim() }
      }
      if (/\seliminado\s*$/i.test(linea) || linea.includes(': eliminado ')) {
        return { tipo: 'eliminado', texto: linea }
      }
      if (/\bagregado\b/i.test(linea)) {
        return { tipo: 'agregado', texto: linea }
      }
      if (/\bcambió a\b/i.test(linea)) {
        return { tipo: 'modificado', texto: linea }
      }
      return { tipo: 'modificado', texto: linea }
    })
}

/**
 * Compara dos snapshots del mismo tipo y devuelve el texto de observación.
 */
export function buildObservacionGenerica<T>(
  antes: T,
  despues: T,
  campos: CampoAuditoria<T>[]
): string | null {
  const lineas: string[] = []

  for (const campo of campos) {
    const bRaw = campo.valor(antes)
    const aRaw = campo.valor(despues)
    const fmt = campo.formato ?? displayValorAuditoria
    const b = fmt(bRaw)
    const a = fmt(aRaw)
    const line = lineaModificado(campo.etiqueta, b, a)
    if (line) lineas.push(line)
  }

  if (lineas.length === 0) return null
  return lineas.join('\n')
}
