import { supabase } from '@/lib/supabase'
import type { DestinoMice, SolicitudMiceForm } from '../types'
import type { MiceCatalogos } from '../types/mice-catalogos'
import { destinosToDbColumns } from '../lib/destinosMice'
import { lugaresToDb } from '../lib/lugaresMice'
import { serviciosToDb } from '../lib/serviciosMice'

export interface SolicitudMiceRelaciones {
  servicios: string[]
  destinos: DestinoMice[]
  lugares: string[]
}

function resolveDestinoIds(
  destino: DestinoMice,
  catalog: MiceCatalogos
): { pais_id: number; ciudad_id: number } | null {
  const paisNombre = destino.pais.trim()
  const ciudadNombre = destino.ciudad.trim()
  if (!paisNombre || !ciudadNombre) return null

  const paisId = catalog.paisIdByNombre.get(paisNombre)
  if (paisId == null) return null

  const ciudadId = catalog.ciudadIdByPaisYNombre.get(`${paisId}|${ciudadNombre}`)
  if (ciudadId == null) return null

  return { pais_id: paisId, ciudad_id: ciudadId }
}

export async function fetchSolicitudRelaciones(
  solicitudId: string
): Promise<{ data: SolicitudMiceRelaciones; error: string | null }> {
  const [servRes, destRes, lugRes] = await Promise.all([
    supabase
      .from('solicitud_mice_servicios')
      .select('servicio_id, orden')
      .eq('solicitud_id', solicitudId)
      .order('orden'),
    supabase
      .from('solicitud_mice_destinos')
      .select('orden, paises_destino(nombre), ciudades_destino(nombre)')
      .eq('solicitud_id', solicitudId)
      .order('orden'),
    supabase
      .from('solicitud_mice_lugares')
      .select('lugares_mice(nombre, orden)')
      .eq('solicitud_id', solicitudId),
  ])

  const err = servRes.error ?? destRes.error ?? lugRes.error
  if (err) {
    return {
      data: { servicios: [], destinos: [], lugares: [] },
      error: err.message,
    }
  }

  const servicios = (servRes.data ?? [])
    .sort((a, b) => (a as { orden: number }).orden - (b as { orden: number }).orden)
    .map(r => (r as { servicio_id: string }).servicio_id)

  const destinos: DestinoMice[] = (destRes.data ?? [])
    .sort((a, b) => (a as { orden: number }).orden - (b as { orden: number }).orden)
    .map(row => {
      const r = row as {
        paises_destino: { nombre: string } | { nombre: string }[] | null
        ciudades_destino: { nombre: string } | { nombre: string }[] | null
      }
      const paisRow = Array.isArray(r.paises_destino) ? r.paises_destino[0] : r.paises_destino
      const ciudadRow = Array.isArray(r.ciudades_destino) ? r.ciudades_destino[0] : r.ciudades_destino
      return {
        pais: paisRow?.nombre ?? '',
        ciudad: ciudadRow?.nombre ?? '',
      }
    })
    .filter(d => d.pais)

  const lugares = (lugRes.data ?? [])
    .map(row => {
      const r = row as { lugares_mice: { nombre: string; orden: number } | { nombre: string; orden: number }[] | null }
      const lugar = Array.isArray(r.lugares_mice) ? r.lugares_mice[0] : r.lugares_mice
      return lugar ? { nombre: lugar.nombre, orden: lugar.orden } : null
    })
    .filter((x): x is { nombre: string; orden: number } => x != null)
    .sort((a, b) => a.orden - b.orden)
    .map(l => l.nombre)

  return { data: { servicios, destinos, lugares }, error: null }
}

async function deleteRelaciones(solicitudId: string): Promise<string | null> {
  const tables = [
    'solicitud_mice_servicios',
    'solicitud_mice_destinos',
    'solicitud_mice_lugares',
  ] as const

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('solicitud_id', solicitudId)
    if (error) return error.message
  }
  return null
}

export async function syncSolicitudRelaciones(
  solicitudId: string,
  form: SolicitudMiceForm,
  catalog: MiceCatalogos
): Promise<{ error: string | null }> {
  const delErr = await deleteRelaciones(solicitudId)
  if (delErr) return { error: delErr }

  if (form.servicios.length > 0) {
    const rows = form.servicios.map((servicio_id, orden) => ({
      solicitud_id: solicitudId,
      servicio_id,
      orden,
    }))
    const { error } = await supabase.from('solicitud_mice_servicios').insert(rows)
    if (error) return { error: error.message }
  }

  const destinoRows: { solicitud_id: string; pais_id: number; ciudad_id: number; orden: number }[] = []
  for (let i = 0; i < form.destinos.length; i++) {
    const ids = resolveDestinoIds(form.destinos[i], catalog)
    if (!ids) {
      return {
        error: `Destino no válido en catálogo: ${form.destinos[i].pais} — ${form.destinos[i].ciudad}`,
      }
    }
    destinoRows.push({ solicitud_id: solicitudId, ...ids, orden: i })
  }
  if (destinoRows.length > 0) {
    const { error } = await supabase.from('solicitud_mice_destinos').insert(destinoRows)
    if (error) return { error: error.message }
  }

  const lugarOrden = catalog.lugares.map(l => l.nombre)
  const lugaresOrdenados = lugarOrden.filter(n => form.lugares.includes(n))
  const extra = form.lugares.filter(n => !lugaresOrdenados.includes(n))
  const todosLugares = [...lugaresOrdenados, ...extra]

  if (todosLugares.length > 0) {
    const rows = todosLugares
      .map(nombre => {
        const lugar_id = catalog.lugarIdByNombre.get(nombre)
        return lugar_id != null ? { solicitud_id: solicitudId, lugar_id } : null
      })
      .filter((r): r is { solicitud_id: string; lugar_id: number } => r != null)

    if (rows.length > 0) {
      const { error } = await supabase.from('solicitud_mice_lugares').insert(rows)
      if (error) return { error: error.message }
    }
  }

  return { error: null }
}

/** Columnas texto legacy en solicitudes_mice (vista y compatibilidad Excel) */
export function relacionesToLegacyColumns(
  form: SolicitudMiceForm,
  catalog: MiceCatalogos
): Record<string, unknown> {
  return {
    servicios: serviciosToDb(form.servicios),
    lugar: lugaresToDb(
      form.lugares,
      catalog.lugares.map(l => l.nombre)
    ),
    ...destinosToDbColumns(form.destinos),
  }
}
