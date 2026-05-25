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

export interface SectorMiceCatalogo {
  id: number
  nombre: string
}

export interface EstadoMiceCatalogo {
  id: number
  codigo: string
  nombre: string
}

export interface ProbabilidadMiceCatalogo {
  id: number
  codigo: string
  nombre: string
}

export interface MiceCatalogos {
  anios: number[]
  monedas: { codigo: string; nombre: string }[]
  estados: EstadoMiceCatalogo[]
  probabilidades: ProbabilidadMiceCatalogo[]
  sectores: SectorMiceCatalogo[]
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
  /** nombre estado normalizado (lower) → id */
  estadoIdByNombre: Map<string, number>
  /** id → nombre estado */
  estadoNombreById: Map<number, string>
  /** codigo → id (legacy / búsqueda) */
  estadoIdByCodigo: Map<string, number>
  probabilidadIdByNombre: Map<string, number>
  probabilidadNombreById: Map<number, string>
  probabilidadIdByCodigo: Map<string, number>
  /** nombre sector formateado (lower) → id */
  sectorIdByNombre: Map<string, number>
  sectorNombreById: Map<number, string>
}

export const MICE_CATALOGOS_VACIOS: MiceCatalogos = {
  anios: [],
  monedas: [],
  estados: [],
  probabilidades: [],
  sectores: [],
  lugares: [],
  servicios: [],
  paises: [],
  ciudadesPorPaisId: new Map(),
  paisIdByNombre: new Map(),
  ciudadIdByPaisYNombre: new Map(),
  lugarIdByNombre: new Map(),
  estadoIdByNombre: new Map(),
  estadoNombreById: new Map(),
  estadoIdByCodigo: new Map(),
  probabilidadIdByNombre: new Map(),
  probabilidadNombreById: new Map(),
  probabilidadIdByCodigo: new Map(),
  sectorIdByNombre: new Map(),
  sectorNombreById: new Map(),
}
