export type {
  EstadoSolicitud,
  TipoSolicitud,
  ModalidadSolicitud,
  SolicitudForm,
} from './solicitud'
export { ESTADOS, TIPOS, MODALIDADES, INITIAL_FORM } from './solicitud'

/** Registro de solicitud usado al editar desde el listado */
export interface SolicitudEdit {
  id: string
  fecha: string
  localizador: string
  cliente: string
  asesor: string
  tiquetes: boolean
  hoteles: boolean
  transportes: boolean
  asistencia: boolean
  otros: boolean
  detalle_otros: string | null
  estado: string
  tipo: string
  modalidad: string
  observaciones: string | null
  status: boolean
  updated_at: string
}
