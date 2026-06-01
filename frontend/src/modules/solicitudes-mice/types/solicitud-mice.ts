export const ANIO_MICE_DEFAULT = new Date().getFullYear()

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
  responsable_id: string
  responsable_nombre: string
  /** Fuente de verdad: raw.xmart_clientes_zeppelin.customerid */
  cliente_id: number | null
  /** Nombre visible (auditoría / UI); resuelto desde cliente_id */
  cliente: string
  /** Nombre visible (auditoría / UI); fuente de verdad: sector_id */
  sector: string
  sector_id: number | null
  mzp: string
  nombre: string
  inicio: string
  fin: string
  /** Nombre visible; fuente de verdad: estado_id */
  estado: EstadoMice | ''
  estado_id: number | null
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
  /** Nombre visible; fuente de verdad: probabilidad_id */
  probabilidad: ProbabilidadMice | ''
  probabilidad_id: number | null
  /** Etapa En operación */
  valor_final_aprobado: string
  utilidad_real: string
}

export const INITIAL_FORM_MICE = (): SolicitudMiceForm => ({
  anio: ANIO_MICE_DEFAULT,
  responsable_id: '',
  responsable_nombre: '',
  cliente_id: null,
  cliente: '',
  sector: '',
  sector_id: null,
  mzp: '',
  nombre: '',
  inicio: '',
  fin: '',
  estado: '',
  estado_id: null,
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
  probabilidad_id: null,
  valor_final_aprobado: '',
  utilidad_real: '',
})

/** Columnas reales en th_solicitud_mice (post-limpieza) */
export interface SolicitudMiceRowDb {
  id: string
  user_id: string
  anio: number
  responsable_id: string
  cliente_id: number | null
  sector_id: number | null
  mzp: string | null
  nombre: string
  inicio: string | null
  fin: string | null
  estado_id: number | null
  valor_cotizado: number | null
  moneda_cotizacion: MonedaCotizacion | null
  utilidad_proyectada: number | null
  fecha_solicitud: string
  fecha_entrega: string | null
  pax: number | null
  tiqueteador_user_id: string | null
  probabilidad_id: number | null
  valor_final_aprobado: number | null
  utilidad_real: number | null
  activo: boolean
  created_at: string
  updated_at: string
}

/** Fila enriquecida para UI (nombres resueltos desde catálogos) */
export interface SolicitudMiceRow extends SolicitudMiceRowDb {
  responsable_nombre: string
  cliente: string
  sector: string | null
  estado: EstadoMice
  probabilidad: ProbabilidadMice | null
  tiqueteador_asignado: string | null
}

export type SolicitudMiceEdit = SolicitudMiceRow
