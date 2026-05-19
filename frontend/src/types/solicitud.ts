export type EstadoSolicitud =
  | 'FINALIZADO'
  | 'EN TRÁMITE'
  | 'PENDIENTE'
  | 'ANULADO'
  | 'COTIZACIÓN RECHAZADA'

export type TipoSolicitud =
  | 'EMISIÓN'
  | 'CAMBIO'
  | 'REEMBOLSO'
  | 'COTIZACIÓN'
  | 'VOUCHER'
  | 'ANULACIÓN'
  | 'CONFIRMACIÓN'
  | 'SEGUIMIENTO'

export type ModalidadSolicitud = 'ONLINE' | 'OFFLINE'

export const CLIENTES = [
  'OCENSA',
  'YANBAL DE COLOMBIA SAS',
  'AVERY DENNISON',
  'ECOPETROL',
  'BANCOLOMBIA',
  'GRUPO NUTRESA',
  'CEMENTOS ARGOS',
] as const

export const ASESORES = [
  'ASESOR 1',
  'ASESOR 2',
  'ASESOR 3',
  'ASESOR 4',
  'ASESOR 5',
] as const

export const ESTADOS: EstadoSolicitud[] = [
  'FINALIZADO',
  'EN TRÁMITE',
  'PENDIENTE',
  'ANULADO',
  'COTIZACIÓN RECHAZADA',
]

export const TIPOS: TipoSolicitud[] = [
  'EMISIÓN',
  'CAMBIO',
  'REEMBOLSO',
  'COTIZACIÓN',
  'VOUCHER',
  'ANULACIÓN',
  'CONFIRMACIÓN',
  'SEGUIMIENTO',
]

export const MODALIDADES: ModalidadSolicitud[] = ['ONLINE', 'OFFLINE']

export interface SolicitudForm {
  fecha: string
  localizador: string
  cliente: string
  asesor: string
  ciudad: string
  tiquetes: boolean | null
  hoteles: boolean | null
  transportes: boolean | null
  asistencia: boolean | null
  otros: boolean | null
  detalle_otros: string
  estado: EstadoSolicitud | ''
  tipo: TipoSolicitud | ''
  modalidad: ModalidadSolicitud | ''
  observaciones: string
}

export const INITIAL_FORM: SolicitudForm = {
  fecha: '',
  localizador: '',
  cliente: '',
  asesor: '',
  ciudad: '',
  tiquetes: null,
  hoteles: null,
  transportes: null,
  asistencia: null,
  otros: null,
  detalle_otros: '',
  estado: '',
  tipo: '',
  modalidad: '',
  observaciones: '',
}
