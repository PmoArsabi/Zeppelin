export const ANIO_MICE_DEFAULT = 2026

export type EstadoMice = string
export type ProbabilidadMice = string
export type MonedaCotizacion = string
export type ServicioMiceId = string

export interface DestinoMice {
  pais: string
  ciudad: string
}

export interface SolicitudMiceForm {
  anio: number
  responsable_nombre: string
  cliente: string
  sector: string
  mzp: string
  nombre: string
  inicio: string
  fin: string
  estado: EstadoMice | ''
  valor_cotizado: string
  moneda_cotizacion: MonedaCotizacion
  utilidad_proyectada: string
  fecha_solicitud: string
  fecha_entrega: string
  servicios: ServicioMiceId[]
  pax: string
  lugares: string[]
  destinos: DestinoMice[]
  tiqueteador_user_id: string
  tiqueteador_asignado: string
  probabilidad: ProbabilidadMice | ''
}

export const INITIAL_FORM_MICE = (): SolicitudMiceForm => ({
  anio: ANIO_MICE_DEFAULT,
  responsable_nombre: '',
  cliente: '',
  sector: '',
  mzp: '',
  nombre: '',
  inicio: '',
  fin: '',
  estado: '',
  valor_cotizado: '',
  moneda_cotizacion: 'COP',
  utilidad_proyectada: '',
  fecha_solicitud: new Date().toISOString().slice(0, 10),
  fecha_entrega: '',
  servicios: [],
  pax: '',
  lugares: [],
  destinos: [],
  tiqueteador_user_id: '',
  tiqueteador_asignado: '',
  probabilidad: '',
})

export interface SolicitudMiceRow {
  id: string
  user_id: string
  anio: number
  responsable_id: string
  responsable_nombre: string
  cliente: string
  sector: string | null
  mzp: string | null
  nombre: string
  inicio: string | null
  fin: string | null
  estado: EstadoMice
  valor_cotizado: number | null
  moneda_cotizacion: MonedaCotizacion | null
  utilidad_proyectada: number | null
  fecha_solicitud: string
  fecha_entrega: string | null
  servicios: string | null
  pax: number | null
  lugar: string | null
  pais_destino: string | null
  ciudad_destino: string | null
  tiqueteador_user_id: string | null
  tiqueteador_asignado: string | null
  probabilidad: ProbabilidadMice | null
  seguimiento: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export type SolicitudMiceEdit = SolicitudMiceRow
