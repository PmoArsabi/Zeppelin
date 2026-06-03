import * as XLSX from 'xlsx'
import type { TipoDocumentoSiigo, FilaSiigo, ResultadoParseo, ErrorParseo, FilaIgnorada } from '../types/siigo'
import { COLUMNAS_REQUERIDAS, COLUMNA_PREFIJOS } from '../types/siigo'

const FILA_ENCABEZADOS = 7

function parsearNumero(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  let s = String(raw).trim()
  const negativo = s.startsWith('(') && s.endsWith(')')
  s = s.replace(/[()]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  if (isNaN(n)) return null
  return negativo ? -n : n
}

function parsearFecha(raw: unknown): string | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw)
    if (!date) return null
    const mm = String(date.m).padStart(2, '0')
    const dd = String(date.d).padStart(2, '0')
    return `${date.y}-${mm}-${dd}`
  }
  const s = String(raw).trim()
  const isoMatch = s.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  const dmyMatch = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`
  return null
}

function canonicalizarHeader(raw: string): string {
  const upper = raw.trim().toUpperCase()
  for (const [canonico, prefijo] of Object.entries(COLUMNA_PREFIJOS)) {
    if (upper.startsWith(prefijo.toUpperCase())) return canonico
  }
  return upper
}

/**
 * Detecta la fila de totales de Siigo: "T O T A L E S  ===>"
 * Solo se ignora si al quitar espacios empieza con "TOTALES" Y contiene "="
 * para no capturar descripciones legítimas como "SALUD TOTAL".
 */
function esFinalTotal(rowMap: Record<string, unknown>): boolean {
  const desc = String(rowMap['DESCRIPCION'] ?? '').trim().toUpperCase()
  const sinEspacios = desc.replace(/\s+/g, '')
  return sinEspacios.startsWith('TOTALES') && desc.includes('=')
}

export function parsearExcelSiigo(
  buffer: ArrayBuffer,
  tipo: TipoDocumentoSiigo
): ResultadoParseo {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheet = workbook.Sheets['Hoja1'] ?? workbook.Sheets[workbook.SheetNames[0]]

  const errFatal = (msg: string): ResultadoParseo => ({
    filas: [], filasConError: [], filasIgnoradas: [],
    errores: [{ fila: 0, columna: '', mensaje: msg }],
  })

  if (!sheet) return errFatal('No se encontró ninguna hoja en el archivo.')

  const todas: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1, defval: null, range: FILA_ENCABEZADOS - 1,
  }) as unknown[][]

  if (todas.length < 2) return errFatal('El archivo no contiene datos desde la fila 7.')

  const headers = (todas[0] as unknown[]).map(h => canonicalizarHeader(String(h ?? '')))

  const requeridas = COLUMNAS_REQUERIDAS[tipo]
  const faltantes = requeridas.filter(col => !headers.includes(col))
  if (faltantes.length > 0) {
    return {
      filas: [], filasConError: [], filasIgnoradas: [],
      errores: [{ fila: 7, columna: faltantes.join(', '), mensaje: `Columnas requeridas no encontradas: ${faltantes.join(', ')}` }],
    }
  }

  const idx = (col: string) => headers.indexOf(col)
  const getString = (row: unknown[], col: string) => {
    const v = idx(col) >= 0 ? row[idx(col)] : null
    return v != null && v !== '' ? String(v).trim() : null
  }

  const filas: FilaSiigo[] = []
  const filasConError: ResultadoParseo['filasConError'] = []
  const filasIgnoradas: FilaIgnorada[] = []
  const errores: ErrorParseo[] = []
  const tieneSucursal = tipo !== 'ingresos_gastos'

  for (let i = 1; i < todas.length; i++) {
    const row = todas[i] as unknown[]
    const nroFila = FILA_ENCABEZADOS + i

    // Fila vacía
    if (row.every(c => c == null || c === '')) {
      filasIgnoradas.push({ nroFila, motivo: 'vacia', descripcion: null })
      continue
    }

    const rowMap: Record<string, unknown> = {}
    headers.forEach((h, j) => { rowMap[h] = row[j] })

    // Fila de totales
    if (esFinalTotal(rowMap)) {
      filasIgnoradas.push({ nroFila, motivo: 'total', descripcion: getString(row, 'DESCRIPCION') })
      continue
    }

    // Validar numéricos
    const numericos: Array<{ campo: keyof FilaSiigo; col: string }> = [
      { campo: 'saldo_anterior', col: 'SALDO ANTERIOR' },
      { campo: 'debitos',        col: 'DEBITOS' },
      { campo: 'creditos',       col: 'CREDITOS' },
      { campo: 'nuevo_saldo',    col: 'NUEVO SALDO' },
    ]

    const filaErrores: ErrorParseo[] = []
    const parsed: Partial<Record<keyof FilaSiigo, number | null>> = {}

    for (const { campo, col } of numericos) {
      const raw = idx(col) >= 0 ? row[idx(col)] : null
      if (raw == null || raw === '') {
        parsed[campo] = null
      } else {
        const n = parsearNumero(raw)
        if (n === null) {
          filaErrores.push({ fila: nroFila, columna: col, mensaje: `Valor no numérico: "${raw}"` })
        } else {
          parsed[campo] = n
        }
      }
    }

    // Validar fecha
    const rawFecha = idx('ULT. MOV.') >= 0 ? row[idx('ULT. MOV.')] : null
    const fecha = parsearFecha(rawFecha)
    if (rawFecha != null && rawFecha !== '' && fecha === null) {
      filaErrores.push({ fila: nroFila, columna: 'ULT. MOV.', mensaje: `Fecha no reconocida: "${rawFecha}"` })
    }

    if (filaErrores.length > 0) {
      errores.push(...filaErrores)
      filasConError.push({
        nroFila,
        fila: {
          grupo: getString(row, 'GRUPO'), cuenta: getString(row, 'CUENTA'),
          subcuenta: getString(row, 'SUBCUENTA'), auxiliar: getString(row, 'AUXILIAR'),
          subauxil: getString(row, 'SUBAUXIL'),
          nit: tieneSucursal ? getString(row, 'NIT') : null,
          sucursal: tieneSucursal ? getString(row, 'SUCURSAL') : null,
          dig_verificacion: tieneSucursal ? getString(row, 'DIG. VERIFICACION') : null,
          descripcion: getString(row, 'DESCRIPCION'),
          ult_mov: fecha, saldo_anterior: null, debitos: null, creditos: null, nuevo_saldo: null,
        },
        errores: filaErrores,
      })
      continue
    }

    filas.push({
      grupo: getString(row, 'GRUPO'), cuenta: getString(row, 'CUENTA'),
      subcuenta: getString(row, 'SUBCUENTA'), auxiliar: getString(row, 'AUXILIAR'),
      subauxil: getString(row, 'SUBAUXIL'),
      nit: tieneSucursal ? getString(row, 'NIT') : null,
      sucursal: tieneSucursal ? getString(row, 'SUCURSAL') : null,
      dig_verificacion: tieneSucursal ? getString(row, 'DIG. VERIFICACION') : null,
      descripcion: getString(row, 'DESCRIPCION'),
      ult_mov: fecha,
      saldo_anterior: parsed.saldo_anterior ?? null,
      debitos: parsed.debitos ?? null,
      creditos: parsed.creditos ?? null,
      nuevo_saldo: parsed.nuevo_saldo ?? null,
    })
  }

  return { filas, filasConError, filasIgnoradas, errores }
}
