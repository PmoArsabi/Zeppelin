import { supabase } from '@/lib/supabase'
import type { DestinoMice, FacturaMice, SolicitudMiceForm } from '../types'
import type { MiceCatalogos } from '../types/mice-catalogos'
import { destinosToDbColumns } from '../lib/destinosMice'
import { lugaresToDb } from '../lib/lugaresMice'
import { serviciosToDb } from '../lib/serviciosMice'

export interface SolicitudMiceRelaciones {
  servicios: string[]
  destinos: DestinoMice[]
  lugares: string[]
  facturas: FacturaMice[]
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
  const [servRes, destRes, lugRes, docRes] = await Promise.all([
    supabase
      .from('th_solicitud_mice_servicios')
      .select('servicio_id, orden')
      .eq('solicitud_id', solicitudId)
      .order('orden'),
    supabase
      .from('th_solicitud_mice_destinos')
      .select('orden, td_pais_destino(nombre), td_ciudades_destino(nombre)')
      .eq('solicitud_id', solicitudId)
      .order('orden'),
    supabase
      .from('th_solicitud_mice_lugares')
      .select('td_lugares(nombre, orden)')
      .eq('solicitud_id', solicitudId),
    supabase
      .from('th_solicitud_mice_documentos')
      .select('numero, th_solicitud_mice_recibos_caja(numero)')
      .eq('solicitud_id', solicitudId)
      .eq('tipo', 'factura')
      .order('created_at'),
  ])

  const err = servRes.error ?? destRes.error ?? lugRes.error ?? docRes.error
  if (err) {
    return {
      data: { servicios: [], destinos: [], lugares: [], facturas: [] },
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
        td_pais_destino: { nombre: string } | { nombre: string }[] | null
        td_ciudades_destino: { nombre: string } | { nombre: string }[] | null
      }
      const paisRow = Array.isArray(r.td_pais_destino) ? r.td_pais_destino[0] : r.td_pais_destino
      const ciudadRow = Array.isArray(r.td_ciudades_destino) ? r.td_ciudades_destino[0] : r.td_ciudades_destino
      return {
        pais: paisRow?.nombre ?? '',
        ciudad: ciudadRow?.nombre ?? '',
      }
    })
    .filter(d => d.pais)

  const lugares = (lugRes.data ?? [])
    .map(row => {
      const r = row as { td_lugares: { nombre: string; orden: number } | { nombre: string; orden: number }[] | null }
      const lugar = Array.isArray(r.td_lugares) ? r.td_lugares[0] : r.td_lugares
      return lugar ? { nombre: lugar.nombre, orden: lugar.orden } : null
    })
    .filter((x): x is { nombre: string; orden: number } => x != null)
    .sort((a, b) => a.orden - b.orden)
    .map(l => l.nombre)

  const facturas: FacturaMice[] = (docRes.data ?? []).map(row => {
    const r = row as {
      numero: string
      th_solicitud_mice_recibos_caja: { numero: string } | { numero: string }[] | null
    }
    const recibo = Array.isArray(r.th_solicitud_mice_recibos_caja)
      ? r.th_solicitud_mice_recibos_caja[0]
      : r.th_solicitud_mice_recibos_caja
    return { numero: r.numero, recibo_caja_numero: recibo?.numero ?? null }
  })

  return { data: { servicios, destinos, lugares, facturas }, error: null }
}

async function deleteRelaciones(solicitudId: string): Promise<string | null> {
  const tables = [
    'th_solicitud_mice_servicios',
    'th_solicitud_mice_destinos',
    'th_solicitud_mice_lugares',
    'th_solicitud_mice_documentos',
    'th_solicitud_mice_recibos_caja',
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
    const { error } = await supabase.from('th_solicitud_mice_servicios').insert(rows)
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
    const { error } = await supabase.from('th_solicitud_mice_destinos').insert(destinoRows)
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
      const { error } = await supabase.from('th_solicitud_mice_lugares').insert(rows)
      if (error) return { error: error.message }
    }
  }

  if (form.facturas.length > 0) {
    const recibosNumeros = Array.from(new Set(
      form.facturas
        .map(f => f.recibo_caja_numero?.toUpperCase().trim())
        .filter((n): n is string => Boolean(n))
    ))

    const reciboIdByNumero = new Map<string, string>()
    if (recibosNumeros.length > 0) {
      const rows = recibosNumeros.map(numero => ({ solicitud_id: solicitudId, numero }))
      const { data, error } = await supabase
        .from('th_solicitud_mice_recibos_caja')
        .insert(rows)
        .select('id, numero')
      if (error) return { error: error.message }
      for (const r of (data ?? []) as { id: string; numero: string }[]) {
        reciboIdByNumero.set(r.numero, r.id)
      }
    }

    const docRows = form.facturas.map(f => {
      const reciboNumero = f.recibo_caja_numero?.toUpperCase().trim() || null
      return {
        solicitud_id: solicitudId,
        tipo: 'factura' as const,
        numero: f.numero.toUpperCase().trim(),
        recibo_caja_id: reciboNumero ? reciboIdByNumero.get(reciboNumero) ?? null : null,
      }
    })
    const { error } = await supabase.from('th_solicitud_mice_documentos').insert(docRows)
    if (error) return { error: error.message }
  }

  return { error: null }
}

function legacyTextFromForm(
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

/** Copia servicios/lugar/destinos a columnas texto solo para listado/Excel (fuente: tablas hijas) */
export async function snapshotLegacyTextFromForm(
  solicitudId: string,
  form: SolicitudMiceForm,
  catalog: MiceCatalogos
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('th_solicitud_mice')
    .update(legacyTextFromForm(form, catalog))
    .eq('id', solicitudId)
  return { error: error?.message ?? null }
}
