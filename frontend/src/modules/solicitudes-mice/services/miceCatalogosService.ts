import { supabase } from '@/lib/supabase'
import { SERVICIOS_MICE_CATALOGO } from '../data/servicios-mice'
import { PAISES_DESTINO_ORDENADOS, ciudadesPorPais } from '../data/paises-ciudades-destino'
import { formatSectorNombre } from '../lib/formatSectorMice'
import {
  MICE_CATALOGOS_VACIOS,
  type CiudadDestinoCatalogo,
  type MiceCatalogos,
  type ServicioMiceCatalogo,
} from '../types/mice-catalogos'

const FALLBACK_ANIOS = [2026, 2025]
const FALLBACK_MONEDAS = [
  { codigo: 'COP', nombre: 'Peso colombiano' },
  { codigo: 'USD', nombre: 'Dólar estadounidense' },
  { codigo: 'EUR', nombre: 'Euro' },
]
const FALLBACK_ESTADOS = [
  { id: 1, codigo: 'en_cotizacion', nombre: 'En cotización' },
  { id: 2, codigo: 'cotizacion_enviada', nombre: 'Cotización Enviada' },
  { id: 3, codigo: 'abierto', nombre: 'Abierto' },
  { id: 4, codigo: 'en_operacion', nombre: 'En operación' },
  { id: 5, codigo: 'en_cierre', nombre: 'En cierre' },
  { id: 6, codigo: 'cerrado', nombre: 'Cerrado' },
  { id: 7, codigo: 'no_adjudicado', nombre: 'No adjudicado - No ganado' },
  { id: 8, codigo: 'cancelado', nombre: 'Cancelado' },
]
const FALLBACK_PROBABILIDADES = [
  { id: 1, codigo: 'baja', nombre: 'Baja' },
  { id: 2, codigo: 'media', nombre: 'Media' },
  { id: 3, codigo: 'alta', nombre: 'Alta' },
  { id: 4, codigo: 'na', nombre: 'N/A' },
]
const FALLBACK_LUGARES = [
  { id: 1, nombre: 'Nacional', orden: 1 },
  { id: 2, nombre: 'Internacional', orden: 2 },
]

function normKey(s: string): string {
  return s.trim().toLowerCase()
}

function buildLookupMaps(
  estados: { id: number; codigo: string; nombre: string }[],
  probabilidades: { id: number; codigo: string; nombre: string }[],
  sectores: { id: number; nombre: string }[]
): Pick<
  MiceCatalogos,
  | 'estadoIdByNombre'
  | 'estadoNombreById'
  | 'estadoIdByCodigo'
  | 'probabilidadIdByNombre'
  | 'probabilidadNombreById'
  | 'probabilidadIdByCodigo'
  | 'sectorIdByNombre'
  | 'sectorNombreById'
> {
  const estadoIdByNombre = new Map<string, number>()
  const estadoNombreById = new Map<number, string>()
  const estadoIdByCodigo = new Map<string, number>()
  for (const e of estados) {
    estadoIdByNombre.set(normKey(e.nombre), e.id)
    estadoNombreById.set(e.id, e.nombre)
    estadoIdByCodigo.set(e.codigo, e.id)
    estadoIdByCodigo.set(normKey(e.codigo), e.id)
  }

  const probabilidadIdByNombre = new Map<string, number>()
  const probabilidadNombreById = new Map<number, string>()
  const probabilidadIdByCodigo = new Map<string, number>()
  for (const p of probabilidades) {
    probabilidadIdByNombre.set(normKey(p.nombre), p.id)
    probabilidadNombreById.set(p.id, p.nombre)
    probabilidadIdByCodigo.set(p.codigo, p.id)
    probabilidadIdByCodigo.set(normKey(p.codigo), p.id)
  }

  const sectorIdByNombre = new Map<string, number>()
  const sectorNombreById = new Map<number, string>()
  for (const s of sectores) {
    sectorNombreById.set(s.id, s.nombre)
    sectorIdByNombre.set(normKey(formatSectorNombre(s.nombre)), s.id)
    sectorIdByNombre.set(normKey(s.nombre), s.id)
  }

  return {
    estadoIdByNombre,
    estadoNombreById,
    estadoIdByCodigo,
    probabilidadIdByNombre,
    probabilidadNombreById,
    probabilidadIdByCodigo,
    sectorIdByNombre,
    sectorNombreById,
  }
}

function buildDestinoMaps(
  paises: { id: number; nombre: string; orden: number }[],
  ciudades: { id: number; pais_id: number; nombre: string }[]
): Pick<MiceCatalogos, 'paises' | 'ciudadesPorPaisId' | 'paisIdByNombre' | 'ciudadIdByPaisYNombre'> {
  const paisesSorted = [...paises].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
  const ciudadesPorPaisId = new Map<number, CiudadDestinoCatalogo[]>()
  const paisIdByNombre = new Map<string, number>()
  const ciudadIdByPaisYNombre = new Map<string, number>()

  for (const p of paisesSorted) {
    paisIdByNombre.set(p.nombre.trim(), p.id)
    ciudadesPorPaisId.set(p.id, [])
  }

  for (const c of ciudades) {
    const entry: CiudadDestinoCatalogo = { id: c.id, paisId: c.pais_id, nombre: c.nombre }
    const list = ciudadesPorPaisId.get(c.pais_id) ?? []
    list.push(entry)
    ciudadesPorPaisId.set(c.pais_id, list)
    ciudadIdByPaisYNombre.set(`${c.pais_id}|${c.nombre.trim()}`, c.id)
  }

  for (const [, list] of ciudadesPorPaisId) {
    list.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }

  return {
    paises: paisesSorted.map(p => ({ id: p.id, nombre: p.nombre, orden: p.orden })),
    ciudadesPorPaisId,
    paisIdByNombre,
    ciudadIdByPaisYNombre,
  }
}

function fallbackDestinosFromCode(): Pick<
  MiceCatalogos,
  'paises' | 'ciudadesPorPaisId' | 'paisIdByNombre' | 'ciudadIdByPaisYNombre'
> {
  let fakeId = 1
  const paises = PAISES_DESTINO_ORDENADOS.map((nombre, i) => ({
    id: fakeId++,
    nombre,
    orden: i + 1,
  }))
  const ciudades: { id: number; pais_id: number; nombre: string }[] = []
  for (const p of paises) {
    for (const ciudad of ciudadesPorPais(p.nombre)) {
      ciudades.push({ id: fakeId++, pais_id: p.id, nombre: ciudad })
    }
  }
  return buildDestinoMaps(paises, ciudades)
}

function fallbackServicios(): ServicioMiceCatalogo[] {
  return SERVICIOS_MICE_CATALOGO.map(s => ({
    id: s.id,
    label: s.label,
    shortLabel: s.shortLabel,
    orden: 0,
  }))
}

export async function fetchMiceCatalogos(): Promise<{
  data: MiceCatalogos
  error: string | null
  usedFallback: boolean
}> {
  const [
    aniosRes,
    monedasRes,
    estadosRes,
    probRes,
    lugaresRes,
    serviciosRes,
    paisesRes,
    ciudadesRes,
    sectoresRes,
  ] = await Promise.all([
    supabase.from('td_anios_mice').select('anio').eq('activo', true).order('anio', { ascending: false }),
    supabase.from('td_monedas').select('codigo, nombre').eq('activo', true).order('codigo'),
    supabase.from('td_estados').select('id, codigo, nombre').eq('activo', true).order('orden'),
    supabase.from('td_probabilidades').select('id, codigo, nombre').eq('activo', true).order('orden'),
    supabase.from('td_lugares').select('id, nombre, orden').eq('activo', true).order('orden'),
    supabase.from('td_servicios').select('id, label, short_label, orden').eq('activo', true).order('orden'),
    supabase.from('td_pais_destino').select('id, nombre, orden').eq('activo', true).order('orden'),
    supabase.from('td_ciudades_destino').select('id, pais_id, nombre').eq('activo', true),
    supabase.from('td_sectores').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  const errors = [
    aniosRes.error,
    monedasRes.error,
    estadosRes.error,
    probRes.error,
    lugaresRes.error,
    serviciosRes.error,
    paisesRes.error,
    ciudadesRes.error,
    sectoresRes.error,
  ].filter(Boolean)

  const dbOk =
    (aniosRes.data?.length ?? 0) > 0 &&
    (serviciosRes.data?.length ?? 0) > 0 &&
    (paisesRes.data?.length ?? 0) > 0

  if (!dbOk) {
    const dest = fallbackDestinosFromCode()
    const lugarIdByNombre = new Map<string, number>()
    for (const l of FALLBACK_LUGARES) lugarIdByNombre.set(l.nombre, l.id)
    const lookup = buildLookupMaps(FALLBACK_ESTADOS, FALLBACK_PROBABILIDADES, [])

    return {
      data: {
        ...MICE_CATALOGOS_VACIOS,
        anios: FALLBACK_ANIOS,
        monedas: FALLBACK_MONEDAS,
        estados: FALLBACK_ESTADOS,
        probabilidades: FALLBACK_PROBABILIDADES,
        sectores: [],
        lugares: FALLBACK_LUGARES,
        servicios: fallbackServicios(),
        ...dest,
        lugarIdByNombre,
        ...lookup,
      },
      error: errors[0]?.message ?? 'Catálogos MICE no disponibles en BD; usando respaldo local.',
      usedFallback: true,
    }
  }

  const lugarIdByNombre = new Map<string, number>()
  const lugares = (lugaresRes.data ?? []).map(row => {
    const l = row as { id: number; nombre: string; orden: number }
    lugarIdByNombre.set(l.nombre, l.id)
    return { id: l.id, nombre: l.nombre, orden: l.orden }
  })

  const servicios = (serviciosRes.data ?? []).map(row => {
    const s = row as { id: string; label: string; short_label: string; orden: number }
    return {
      id: s.id,
      label: s.label,
      shortLabel: s.short_label,
      orden: s.orden,
    }
  })

  const dest = buildDestinoMaps(
    (paisesRes.data ?? []) as { id: number; nombre: string; orden: number }[],
    (ciudadesRes.data ?? []) as { id: number; pais_id: number; nombre: string }[]
  )

  const estados = (estadosRes.data ?? []).map(r => {
    const e = r as { id: number; codigo: string; nombre: string }
    return { id: e.id, codigo: e.codigo, nombre: e.nombre }
  })
  const probabilidades = (probRes.data ?? []).map(r => {
    const p = r as { id: number; codigo: string; nombre: string }
    return { id: p.id, codigo: p.codigo, nombre: p.nombre }
  })
  const sectores = (sectoresRes.data ?? []).map(r => {
    const s = r as { id: number; nombre: string }
    return { id: s.id, nombre: s.nombre }
  })
  const lookup = buildLookupMaps(estados, probabilidades, sectores)

  return {
    data: {
      anios: (aniosRes.data ?? []).map(r => (r as { anio: number }).anio),
      monedas: (monedasRes.data ?? []).map(r => {
        const m = r as { codigo: string; nombre: string }
        return { codigo: m.codigo, nombre: m.nombre }
      }),
      estados,
      probabilidades,
      sectores,
      lugares,
      servicios,
      lugarIdByNombre,
      ...dest,
      ...lookup,
    },
    error: errors.length > 0 ? errors.map(e => e!.message).join('; ') : null,
    usedFallback: false,
  }
}

export function servicioCatalogoPorId(
  catalog: MiceCatalogos,
  id: string
): ServicioMiceCatalogo | undefined {
  return catalog.servicios.find(s => s.id === id)
}

export function ciudadesCatalogoPorPais(
  catalog: MiceCatalogos,
  paisNombre: string
): CiudadDestinoCatalogo[] {
  const paisId = catalog.paisIdByNombre.get(paisNombre.trim())
  if (paisId == null) return []
  return catalog.ciudadesPorPaisId.get(paisId) ?? []
}
