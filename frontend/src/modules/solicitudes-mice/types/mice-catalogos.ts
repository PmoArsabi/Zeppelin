export interface ServicioMiceCatalogo {
  id: string
  label: string
  shortLabel: string
  orden: number
}

export interface PaisDestinoCatalogo {
  id: number
  nombre: string
  orden: number
}

export interface CiudadDestinoCatalogo {
  id: number
  paisId: number
  nombre: string
}

export interface LugarMiceCatalogo {
  id: number
  nombre: string
  orden: number
}

export interface MiceCatalogos {
  anios: number[]
  monedas: { codigo: string; nombre: string }[]
  estados: { codigo: string; nombre: string }[]
  probabilidades: { codigo: string; nombre: string }[]
  lugares: LugarMiceCatalogo[]
  servicios: ServicioMiceCatalogo[]
  paises: PaisDestinoCatalogo[]
  ciudadesPorPaisId: Map<number, CiudadDestinoCatalogo[]>
  /** nombre país (trim) → id */
  paisIdByNombre: Map<string, number>
  /** `${paisId}|${ciudad nombre}` → ciudad id */
  ciudadIdByPaisYNombre: Map<string, number>
  /** nombre lugar → id */
  lugarIdByNombre: Map<string, number>
}

export const MICE_CATALOGOS_VACIOS: MiceCatalogos = {
  anios: [],
  monedas: [],
  estados: [],
  probabilidades: [],
  lugares: [],
  servicios: [],
  paises: [],
  ciudadesPorPaisId: new Map(),
  paisIdByNombre: new Map(),
  ciudadIdByPaisYNombre: new Map(),
  lugarIdByNombre: new Map(),
}
