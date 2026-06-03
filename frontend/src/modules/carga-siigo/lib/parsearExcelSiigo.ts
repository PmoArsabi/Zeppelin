import * as XLSX from 'xlsx'
import type { TipoDocumentoSiigo, FilaSiigo, ResultadoParseo, ErrorParseo } from '../types/siigo'
import { COLUMNAS_REQUERIDAS } from '../types/siigo'

const FILA_ENCABEZADOS = 7  // fila 7 (1-indexed) contiene los encabezados reales

// ---------------------------------------------------------------------------
// Helpers de limpieza
// ---------------------------------------------------------------------------

/** Convierte valores con paréntesis "(1.234,00)" a negativos y normaliza decimales */
function parsearNumero(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  let s = String(raw).trim()
  const negativo = s.startsWith('(') && s.endsWith(')')
  s = s.replace(/[()]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  if (isNaN(n)) return null
  return negativo ? -n : n
}

/** Convierte fecha Excel (número serial o string YYYY/MM/DD | DD/MM/YYYY) a ISO */
function parsearFecha(raw: unknown): string | null {
  if (raw == null || raw === '') return null
  // Número serial de Excel
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw)
    if (!date) return null
    const mm = String(date.m).padStart(2, '0')
    const dd = String(date.d).padStart(2, '0')
    return `${date.y}-${mm}-${dd}`
  }
  const s = String(raw).trim()
  // YYYY/MM/DD o YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  // DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`
  return null
}

function normalizeHeader(h: unknown): string {
  return String(h ?? '').trim().toUpperCase()
}

/** La última fila suele ser el total — la detectamos si DESCRIPCION contiene "TOTAL" */
function esFinalTotal(row: Record<string, unknown>): boolean {
  const desc = String(row['DESCRIPCION'] ?? row['descripcion'] ?? '').trim().toUpperCase()
  return desc.startsWith('TOTAL')
}

// ---------------------------------------------------------------------------
// Parser principal
// ---------------------------------------------------------------------------

export function parsearExcelSiigo(
  buffer: ArrayBuffer,
  tipo: TipoDocumentoSiigo
): ResultadoParseo {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheet = workbook.Sheets['Hoja1'] ?? workbook.Sheets[workbook.SheetNames[0]]

  if (!sheet) {
    return { filas: [], errores: [{ fila: 0, columna: '', mensaje: 'No se encontró ninguna hoja en el archivo.' }], filasIgnoradas: 0 }
  }

  // Leer todo como array de arrays desde fila 7 (índice 6)
  const todas: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    range: FILA_ENCABEZADOS - 1,  // 0-indexed
  }) as unknown[][]

  if (todas.length < 2) {
    return { filas: [], errores: [{ fila: 0, columna: '', mensaje: 'El archivo no contiene datos desde la fila 7.' }], filasIgnoradas: 0 }
  }

  // Primera fila = encabezados
  const rawHeaders = todas[0] as unknown[]
  const headers = rawHeaders.map(normalizeHeader)

  // Validar columnas requeridas
  const requeridas = COLUMNAS_REQUERIDAS[tipo]
  const faltantes = requeridas.filter(col => !headers.includes(col))
  if (faltantes.length > 0) {
    return {
      filas: [],
      errores: [{ fila: 7, columna: faltantes.join(', '), mensaje: `Columnas requeridas no encontradas: ${faltantes.join(', ')}` }],
      filasIgnoradas: 0,
    }
  }

  const idx = (col: string) => headers.indexOf(col)

  const filas: FilaSiigo[] = []
  const errores: ErrorParseo[] = []
  let filasIgnoradas = 0

  const tieneSucursal = tipo !== 'ingresos_gastos'

  for (let i = 1; i < todas.length; i++) {
    const row = todas[i] as unknown[]
    const nroFila = FILA_ENCABEZADOS + i  // número de fila real en el Excel

    // Saltar filas completamente vacías
    if (row.every(c => c == null || c === '')) {
      filasIgnoradas++
      continue
    }

    // Convertir fila a mapa por encabezado para esFinalTotal
    const rowMap: Record<string, unknown> = {}
    headers.forEach((h, j) => { rowMap[h] = row[j] })

    // Saltar fila de total (última)
    if (esFinalTotal(rowMap)) {
      filasIgnoradas++
      continue
    }

    // Validar y parsear numéricos
    const numericos: Array<{ campo: keyof FilaSiigo; col: string }> = [
      { campo: 'saldo_anterior', col: 'SALDO ANTERIOR' },
      { campo: 'debitos',        col: 'DEBITOS' },
      { campo: 'creditos',       col: 'CREDITOS' },
      { campo: 'nuevo_saldo',    col: 'NUEVO SALDO' },
    ]

    let filaValida = true
    const parsed: Partial<Record<keyof FilaSiigo, number | null>> = {}

    for (const { campo, col } of numericos) {
      const raw = idx(col) >= 0 ? row[idx(col)] : null
      if (raw == null || raw === '') {
        parsed[campo] = null
      } else {
        const n = parsearNumero(raw)
        if (n === null) {
          errores.push({ fila: nroFila, columna: col, mensaje: `Valor no numérico: "${raw}"` })
          filaValida = false
        } else {
          parsed[campo] = n
        }
      }
    }

    // Fecha
    const rawFecha = idx('ULT. MOV.') >= 0 ? row[idx('ULT. MOV.')] : null
    const fecha = parsearFecha(rawFecha)
    if (rawFecha != null && rawFecha !== '' && fecha === null) {
      errores.push({ fila: nroFila, columna: 'ULT. MOV.', mensaje: `Fecha no reconocida: "${rawFecha}"` })
    }

    if (!filaValida) continue

    const getString = (col: string) => {
      const v = idx(col) >= 0 ? row[idx(col)] : null
      return v != null && v !== '' ? String(v).trim() : null
    }

    filas.push({
      grupo:            getString('GRUPO'),
      cuenta:           getString('CUENTA'),
      subcuenta:        getString('SUBCUENTA'),
      auxiliar:         getString('AUXILIAR'),
      subauxil:         getString('SUBAUXIL'),
      nit:              tieneSucursal ? getString('NIT') : null,
      sucursal:         tieneSucursal ? getString('SUCURSAL') : null,
      dig_verificacion: tieneSucursal ? getString('DIG. VERIFICACION') : null,
      descripcion:      getString('DESCRIPCION'),
      ult_mov:          fecha,
      saldo_anterior:   parsed.saldo_anterior ?? null,
      debitos:          parsed.debitos ?? null,
      creditos:         parsed.creditos ?? null,
      nuevo_saldo:      parsed.nuevo_saldo ?? null,
    })
  }

  return { filas, errores, filasIgnoradas }
}
