import * as XLSX from 'xlsx'
import type { TipoDocumentoSiigo, FilaSiigo, ResultadoParseo, ErrorParseo, FilaIgnorada, FilaPresupuesto, ResultadoParseoPresupuesto } from '../types/siigo'
import { COLUMNAS_REQUERIDAS, COLUMNA_PREFIJOS } from '../types/siigo'

const FILA_ENCABEZADOS = 7

function parsearNumero(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return raw
  let s = String(raw).trim()
  // Formato de celda Excel para cero: "$ -", "$ -  ", "- ", etc.
  if (/^\$?\s*-\s*$/.test(s)) return 0
  // Quitar símbolo $, espacios internos y separadores de miles
  s = s.replace(/\$/g, '').trim()
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

const PREFIJOS_PRESUPUESTO: Record<string, string> = {
  MES:                   'MES',
  CORP:                  'CORP',
  'MICE GANADO':         'MICE GANADO',
  'MICE NUEVOS NEGOCIOS':'MICE NUEVOS',
  'TOTAL MICE':          'TOTAL MICE',
  TOTAL:                 'TOTAL',
}

function canonicalizarHeaderPresupuesto(raw: string): string {
  const upper = raw.trim().toUpperCase()
  for (const [canonico, prefijo] of Object.entries(PREFIJOS_PRESUPUESTO)) {
    if (upper.startsWith(prefijo)) return canonico
  }
  return upper
}

export function parsearExcelPresupuesto(buffer: ArrayBuffer): ResultadoParseoPresupuesto {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheet = workbook.Sheets['Hoja1'] ?? workbook.Sheets[workbook.SheetNames[0]]

  const errFatal = (msg: string): ResultadoParseoPresupuesto => ({
    filas: [], filasConError: [], filasIgnoradas: [],
    errores: [{ fila: 0, columna: '', mensaje: msg }],
  })

  if (!sheet) return errFatal('No se encontró ninguna hoja en el archivo.')

  const todas: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1, defval: null,
  }) as unknown[][]

  if (todas.length < 2) return errFatal('El archivo no contiene datos suficientes.')

  // Buscar la fila de encabezados (la que contenga "MES")
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(todas.length, 10); i++) {
    const row = todas[i] as unknown[]
    const upper = row.map(c => String(c ?? '').trim().toUpperCase())
    if (upper.some(c => c.startsWith('MES'))) { headerRowIdx = i; break }
  }
  if (headerRowIdx === -1) return errFatal('No se encontró fila de encabezados con columna MES.')

  const headers = (todas[headerRowIdx] as unknown[]).map(h => canonicalizarHeaderPresupuesto(String(h ?? '')))

  const requeridas = ['MES', 'CORP', 'MICE GANADO', 'MICE NUEVOS NEGOCIOS']
  const faltantes = requeridas.filter(col => !headers.includes(col))
  if (faltantes.length > 0) {
    return {
      filas: [], filasConError: [], filasIgnoradas: [],
      errores: [{ fila: headerRowIdx + 1, columna: faltantes.join(', '), mensaje: `Columnas requeridas no encontradas: ${faltantes.join(', ')}` }],
    }
  }

  const idx = (col: string) => headers.indexOf(col)

  const filas: FilaPresupuesto[] = []
  const filasConError: ResultadoParseoPresupuesto['filasConError'] = []
  const filasIgnoradas: FilaIgnorada[] = []
  const errores: ErrorParseo[] = []

  for (let i = headerRowIdx + 1; i < todas.length; i++) {
    const row = todas[i] as unknown[]
    const nroFila = i + 1

    if (row.every(c => c == null || c === '')) {
      filasIgnoradas.push({ nroFila, motivo: 'vacia', descripcion: null })
      continue
    }

    // Ignorar fila de totales
    const rawMes = row[idx('MES')]
    const mesTxt = String(rawMes ?? '').trim().toUpperCase().replace(/\s+/g, '')
    if (mesTxt.startsWith('TOTAL') || mesTxt === '') {
      filasIgnoradas.push({ nroFila, motivo: 'total', descripcion: String(rawMes ?? '') })
      continue
    }

    // Resolver mes: puede venir como número 1-12, nombre ("Enero"), serial de fecha Excel (>1000), o texto "MM/YY"
    let mesNum: number | null = null
    const NOMBRE_MES: Record<string, number> = {
      ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6,
      JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12,
      ENE:1, FEB:2, MAR:3, ABR:4, JUN:6, JUL:7, AGO:8, SEP:9, OCT:10, NOV:11, DIC:12,
    }
    if (typeof rawMes === 'number') {
      if (rawMes >= 1 && rawMes <= 12) {
        mesNum = rawMes
      } else {
        // Serial de fecha Excel (ej. 46023 = 1/01/2026)
        const parsed = XLSX.SSF.parse_date_code(rawMes)
        if (parsed) mesNum = parsed.m
      }
    } else {
      const mesInt = parseInt(String(rawMes ?? ''), 10)
      if (!isNaN(mesInt) && mesInt >= 1 && mesInt <= 12) {
        mesNum = mesInt
      } else {
        // Texto "MM/YY" o "MM/YYYY" → extraer mes
        const mmYY = String(rawMes ?? '').trim().match(/^(\d{1,2})[/\-](\d{2,4})$/)
        if (mmYY) {
          const m = parseInt(mmYY[1], 10)
          if (m >= 1 && m <= 12) mesNum = m
        } else {
          mesNum = NOMBRE_MES[mesTxt] ?? null
        }
      }
    }

    const filaErrores: ErrorParseo[] = []
    if (mesNum === null) {
      filaErrores.push({ fila: nroFila, columna: 'MES', mensaje: `Mes no reconocido: "${rawMes}"` })
    }

    const numericos: Array<{ campo: keyof FilaPresupuesto; col: string }> = [
      { campo: 'corp',        col: 'CORP' },
      { campo: 'mice_ganado', col: 'MICE GANADO' },
      { campo: 'mice_nuevos', col: 'MICE NUEVOS NEGOCIOS' },
    ]

    const parsed: Partial<Record<keyof FilaPresupuesto, number | null>> = {}
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

    if (filaErrores.length > 0) {
      errores.push(...filaErrores)
      filasConError.push({ nroFila, errores: filaErrores })
      continue
    }

    filas.push({
      mes:         mesNum!,
      corp:        parsed.corp        ?? null,
      mice_ganado: parsed.mice_ganado ?? null,
      mice_nuevos: parsed.mice_nuevos ?? null,
    })
  }

  return { filas, filasConError, filasIgnoradas, errores }
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
