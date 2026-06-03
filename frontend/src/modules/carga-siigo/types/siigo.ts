export type TipoDocumentoSiigo = 'cuentas_pagar' | 'cuentas_cobrar' | 'ingresos_gastos'

export const TIPO_LABELS: Record<TipoDocumentoSiigo, string> = {
  cuentas_pagar:    'Cuentas por pagar',
  cuentas_cobrar:   'Cuentas por cobrar clientes nacionales',
  ingresos_gastos:  'Ingresos y gastos',
}

export const MESES: { value: number; label: string }[] = [
  { value: 1,  label: 'Enero' },
  { value: 2,  label: 'Febrero' },
  { value: 3,  label: 'Marzo' },
  { value: 4,  label: 'Abril' },
  { value: 5,  label: 'Mayo' },
  { value: 6,  label: 'Junio' },
  { value: 7,  label: 'Julio' },
  { value: 8,  label: 'Agosto' },
  { value: 9,  label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

/** Columnas requeridas por tipo. Las columnas opcionales se leen si existen. */
export const COLUMNAS_REQUERIDAS: Record<TipoDocumentoSiigo, string[]> = {
  cuentas_pagar: [
    'GRUPO','CUENTA','SUBCUENTA','AUXILIAR','SUBAUXIL',
    'NIT','SUCURSAL','DIG. VERIFICACION',
    'DESCRIPCION','ULT. MOV.','SALDO ANTERIOR','DEBITOS','CREDITOS','NUEVO SALDO',
  ],
  cuentas_cobrar: [
    'GRUPO','CUENTA','SUBCUENTA','AUXILIAR','SUBAUXIL',
    'NIT','SUCURSAL','DIG. VERIFICACION',
    'DESCRIPCION','ULT. MOV.','SALDO ANTERIOR','DEBITOS','CREDITOS','NUEVO SALDO',
  ],
  ingresos_gastos: [
    'GRUPO','CUENTA','SUBCUENTA','AUXILIAR','SUBAUXIL',
    'DESCRIPCION','ULT. MOV.','SALDO ANTERIOR','DEBITOS','CREDITOS','NUEVO SALDO',
  ],
}

/** Fila cruda parseada del Excel (antes de tipado) */
export interface FilaSiigo {
  grupo:            string | null
  cuenta:           string | null
  subcuenta:        string | null
  auxiliar:         string | null
  subauxil:         string | null
  nit:              string | null
  sucursal:         string | null
  dig_verificacion: string | null
  descripcion:      string | null
  ult_mov:          string | null  // ISO date YYYY-MM-DD o null
  saldo_anterior:   number | null
  debitos:          number | null
  creditos:         number | null
  nuevo_saldo:      number | null
}

export interface ResultadoParseo {
  filas: FilaSiigo[]
  errores: ErrorParseo[]
  filasIgnoradas: number
}

export interface ErrorParseo {
  fila: number
  columna: string
  mensaje: string
}

export interface EstadoCarga {
  tipo: 'idle' | 'parsing' | 'preview' | 'confirming' | 'done' | 'error'
  mensaje?: string
}
