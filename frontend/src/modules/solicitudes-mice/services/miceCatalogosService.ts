import { supabase } from '@/lib/supabase'
import { SERVICIOS_MICE_CATALOGO } from '../data/servicios-mice'
import { PAISES_DESTINO_ORDENADOS, ciudadesPorPais } from '../data/paises-ciudades-destino'
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
  { codigo: 'cerrado', nombre: 'Cerrado' },
  { codigo: 'no_adjudicado', nombre: 'No adjudicado - No ganado' },
  { codigo: 'cancelado', nombre: 'Cancelado' },
]
const FALLBACK_PROBABILIDADES = [
  { codigo: 'baja', nombre: 'Baja' },
  { codigo: 'media', nombre: 'Media' },
  { codigo: 'alta', nombre: 'Alta' },
  { codigo: 'na', nombre: 'N/A' },
]
const FALLBACK_LUGARES = [
  { id: 1, nombre: 'Nacional', orden: 1 },
  { id: 2, nombre: 'Internacional', orden: 2 },
]

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
  ] = await Promise.all([
    supabase.from('anios_mice').select('anio').eq('activo', true).order('anio', { ascending: false }),
    supabase.from('monedas_mice').select('codigo, nombre').eq('activo', true).order('codigo'),
    supabase.from('estados_mice').select('codigo, nombre').eq('activo', true).order('orden'),
    supabase.from('probabilidades_mice').select('codigo, nombre').eq('activo', true).order('orden'),
    supabase.from('lugares_mice').select('id, nombre, orden').eq('activo', true).order('orden'),
    supabase.from('servicios_mice').select('id, label, short_label, orden').eq('activo', true).order('orden'),
    supabase.from('paises_destino').select('id, nombre, orden').eq('activo', true).order('orden'),
    supabase.from('ciudades_destino').select('id, pais_id, nombre').eq('activo', true),
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
  ].filter(Boolean)

  const dbOk =
    (aniosRes.data?.length ?? 0) > 0 &&
    (serviciosRes.data?.length ?? 0) > 0 &&
    (paisesRes.data?.length ?? 0) > 0

  if (!dbOk) {
    const dest = fallbackDestinosFromCode()
    const lugarIdByNombre = new Map<string, number>()
    for (const l of FALLBACK_LUGARES) lugarIdByNombre.set(l.nombre, l.id)

    return {
      data: {
        ...MICE_CATALOGOS_VACIOS,
        anios: FALLBACK_ANIOS,
        monedas: FALLBACK_MONEDAS,
        estados: FALLBACK_ESTADOS,
        probabilidades: FALLBACK_PROBABILIDADES,
        lugares: FALLBACK_LUGARES,
        servicios: fallbackServicios(),
        ...dest,
        lugarIdByNombre,
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

  return {
    data: {
      anios: (aniosRes.data ?? []).map(r => (r as { anio: number }).anio),
      monedas: (monedasRes.data ?? []).map(r => {
        const m = r as { codigo: string; nombre: string }
        return { codigo: m.codigo, nombre: m.nombre }
      }),
      estados: (estadosRes.data ?? []).map(r => {
        const e = r as { codigo: string; nombre: string }
        return { codigo: e.codigo, nombre: e.nombre }
      }),
      probabilidades: (probRes.data ?? []).map(r => {
        const p = r as { codigo: string; nombre: string }
        return { codigo: p.codigo, nombre: p.nombre }
      }),
      lugares,
      servicios,
      lugarIdByNombre,
      ...dest,
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
