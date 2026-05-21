import { supabase } from '@/lib/supabase'
import { formatDecimalCO, parseDecimalCO } from '@/lib/decimalFormat'
import { mzpFromSuffix, mzpSuffix } from '@/lib/mzpFormat'
import { destinosToDbColumns, dbColumnsToDestinos } from '../lib/destinosMice'
import { lugaresToDb, dbToLugares } from '../lib/lugaresMice'
import { serviciosToDb, dbToServicios } from '../lib/serviciosMice'
import {
  ANIO_MICE_DEFAULT,
  type SolicitudMiceForm,
  type SolicitudMiceRow,
} from '../types'
import type { MiceCatalogos } from '../types/mice-catalogos'
import {
  fetchSolicitudRelaciones,
  relacionesToLegacyColumns,
  syncSolicitudRelaciones,
  type SolicitudMiceRelaciones,
} from './miceRelacionesService'
import { addSeguimientoMice } from './seguimientoMiceService'
import { buildAuditoriaMiceObservacion } from '@/lib/auditoria/camposMice'
import { registrarAuditoriaEdicion } from '@/lib/auditoria/logAuditoriaService'

const TABLE = 'solicitudes_mice'

/** Primera letra mayúscula, resto minúsculas (ej. TELEVISION → Television) */
export function formatSectorNombre(nombre: string): string {
  const t = nombre.trim()
  if (!t) return ''
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

function parseNum(value: string): number | null {
  return parseDecimalCO(value)
}

function emptyToNull(value: string): string | null {
  const t = value.trim()
  return t || null
}

/** Valor válido para input type="date" (YYYY-MM-DD) */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return ''
}

export function formToPayload(
  form: SolicitudMiceForm,
  userId: string
): Record<string, unknown> {
  return {
    user_id: userId,
    responsable_id: userId,
    responsable_nombre: form.responsable_nombre.trim(),
    anio: form.anio,
    cliente: form.cliente.trim(),
    sector: form.sector.trim() ? formatSectorNombre(form.sector) : null,
    mzp: (() => {
      const code = mzpFromSuffix(mzpSuffix(form.mzp))
      return code || null
    })(),
    nombre: form.nombre.trim(),
    inicio: emptyToNull(form.inicio),
    fin: emptyToNull(form.fin),
    estado: form.estado,
    valor_cotizado: parseNum(form.valor_cotizado),
    moneda_cotizacion: form.moneda_cotizacion,
    utilidad_proyectada: parseNum(form.utilidad_proyectada),
    fecha_solicitud: form.fecha_solicitud,
    fecha_entrega: emptyToNull(form.fecha_entrega),
    servicios: serviciosToDb(form.servicios),
    pax: form.pax.trim() ? parseInt(form.pax, 10) : null,
    lugar: lugaresToDb(form.lugares),
    ...destinosToDbColumns(form.destinos),
    tiqueteador_user_id: form.tiqueteador_user_id.trim() || null,
    tiqueteador_asignado: emptyToNull(form.tiqueteador_asignado),
    probabilidad: form.probabilidad || null,
  }
}

export function rowToForm(
  row: SolicitudMiceRow,
  catalog?: MiceCatalogos,
  relaciones?: SolicitudMiceRelaciones | null
): SolicitudMiceForm {
  const anios = catalog?.anios ?? []
  const anioDefault = anios[0] ?? ANIO_MICE_DEFAULT
  const lugarNombres = catalog?.lugares.map(l => l.nombre)

  const serviciosTexto = dbToServicios(row.servicios, catalog?.servicios)
  const destinosTexto = dbColumnsToDestinos(row.pais_destino, row.ciudad_destino)
  const lugaresTexto = dbToLugares(row.lugar, lugarNombres)

  return {
    anio: anios.includes(row.anio) ? row.anio : anioDefault,
    responsable_nombre: row.responsable_nombre,
    cliente: row.cliente,
    sector: row.sector ? formatSectorNombre(row.sector) : '',
    mzp: row.mzp ?? '',
    nombre: row.nombre,
    inicio: toDateInputValue(row.inicio),
    fin: toDateInputValue(row.fin),
    estado: row.estado,
    valor_cotizado: row.valor_cotizado != null ? formatDecimalCO(row.valor_cotizado) : '',
    moneda_cotizacion: row.moneda_cotizacion ?? 'COP',
    utilidad_proyectada: row.utilidad_proyectada != null ? formatDecimalCO(row.utilidad_proyectada) : '',
    fecha_solicitud: row.fecha_solicitud,
    fecha_entrega: row.fecha_entrega ?? '',
    servicios: relaciones?.servicios.length ? relaciones.servicios : serviciosTexto,
    pax: row.pax != null ? String(row.pax) : '',
    lugares: relaciones?.lugares.length ? relaciones.lugares : lugaresTexto,
    destinos: relaciones?.destinos.length ? relaciones.destinos : destinosTexto,
    tiqueteador_user_id: row.tiqueteador_user_id ?? '',
    tiqueteador_asignado: row.tiqueteador_asignado ?? '',
    probabilidad: row.probabilidad ?? '',
  }
}

export async function listSolicitudesMice(
  userId: string,
  isAdmin: boolean
): Promise<{ data: SolicitudMiceRow[] | null; error: string | null }> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .order('fecha_solicitud', { ascending: false })
    .order('created_at', { ascending: false })

  if (!isAdmin) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data: data as SolicitudMiceRow[], error: null }
}

export async function loadSolicitudForEdit(
  row: SolicitudMiceRow,
  catalog: MiceCatalogos
): Promise<{ form: SolicitudMiceForm; error: string | null }> {
  const { data: rel, error } = await fetchSolicitudRelaciones(row.id)
  if (error) {
    return { form: rowToForm(row, catalog), error }
  }
  return { form: rowToForm(row, catalog, rel), error: null }
}

export async function saveSolicitudMice(
  form: SolicitudMiceForm,
  userId: string,
  catalog: MiceCatalogos,
  editId?: string,
  primerSeguimiento?: string,
  formAntesEdicion?: SolicitudMiceForm | null
): Promise<{ error: string | null; id?: string; auditWarning?: string | null }> {
  const payload = {
    ...formToPayload(form, userId),
    ...relacionesToLegacyColumns(form, catalog),
  }

  if (editId) {
    const { error } = await supabase.from(TABLE).update(payload).eq('id', editId)
    if (error) return { error: error.message }
    const rel = await syncSolicitudRelaciones(editId, form, catalog)
    if (rel.error) return rel

    let auditWarning: string | null = null
    if (formAntesEdicion) {
      const observacion = buildAuditoriaMiceObservacion(formAntesEdicion, form, catalog)
      const audit = await registrarAuditoriaEdicion(
        'solicitudes-mice',
        editId,
        userId,
        form.responsable_nombre.trim() || 'Usuario',
        observacion
      )
      auditWarning = audit.warning
    }
    return { error: null, id: editId, auditWarning }
  }

  const { data, error } = await supabase.from(TABLE).insert(payload).select('id').single()
  if (error) return { error: error.message }
  if (!data?.id) return { error: 'No se obtuvo el id de la solicitud creada.' }

  const newId = data.id as string
  const rel = await syncSolicitudRelaciones(newId, form, catalog)
  if (rel.error) return rel

  const segText = primerSeguimiento?.trim()
  if (segText) {
    const seg = await addSeguimientoMice(
      newId,
      userId,
      form.responsable_nombre.trim() || 'Usuario',
      segText
    )
    if (seg.error) return { error: seg.error, id: newId }
  }

  return { error: null, id: newId }
}

export async function fetchUsuariosTiqueteador(): Promise<{
  data: { value: string; label: string }[]
  error: string | null
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .order('display_name')

  if (error) return { data: [], error: error.message }

  const list = (data ?? [])
    .filter((row): row is { id: string; display_name: string } => Boolean(row.display_name?.trim()))
    .map(row => ({
      value: row.id,
      label: row.display_name.trim(),
    }))

  return { data: list, error: null }
}

export async function fetchSectoresMice(): Promise<string[]> {
  const { data } = await supabase.from('sectores_mice').select('nombre').order('nombre')
  const seen = new Set<string>()
  const list: string[] = []
  for (const row of data ?? []) {
    const formatted = formatSectorNombre((row as { nombre: string }).nombre)
    if (formatted && !seen.has(formatted)) {
      seen.add(formatted)
      list.push(formatted)
    }
  }
  return list.sort((a, b) => a.localeCompare(b, 'es'))
}
