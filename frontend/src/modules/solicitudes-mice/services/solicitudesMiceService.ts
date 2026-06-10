import { supabase } from '@/lib/supabase'
import { formatDecimalCO, parseDecimalCO } from '@/lib/decimalFormat'
import { mzpFromSuffix, mzpSuffix } from '@/lib/mzpFormat'
import {
  ANIO_MICE_DEFAULT,
  type SolicitudMiceForm,
  type SolicitudMiceRow,
  type SolicitudMiceRowDb,
} from '../types'
import type { MiceCatalogos } from '../types/mice-catalogos'
import { MICE_CATALOGOS_VACIOS } from '../types/mice-catalogos'
import { enrichMiceRowDisplay } from '../lib/enrichMiceRow'
import {
  fetchSolicitudRelaciones,
  syncSolicitudRelaciones,
  type SolicitudMiceRelaciones,
} from './miceRelacionesService'
import { addSeguimientoMice } from './seguimientoMiceService'
import { buildAuditoriaMiceCreacion, buildAuditoriaMiceObservacion } from '@/lib/auditoria/camposMice'
import { registrarAuditoriaEdicion } from '@/lib/auditoria/logAuditoriaService'
import { fetchMiceCatalogos } from './miceCatalogosService'
import { resolveNextMzpCode } from './mzpConsecutivoService'
import { buildClienteNombreById, fetchClientesByIds } from '@/lib/clientes'
import { formatSectorNombre } from '../lib/formatSectorMice'
import {
  pickEstadoIdForSave,
  pickProbabilidadIdForSave,
  resolveEstadoIdFromLegacy,
  resolveProbabilidadIdFromLegacy,
  resolveEstadoNombre,
  resolveProbabilidadNombre,
  resolveSectorId,
} from '../lib/miceCatalogResolve'

export { formatSectorNombre }

const TABLE = 'th_solicitud_mice'

export type TiqueteadorOption = { value: string; label: string }

type UserWithRolesRow = {
  id: string
  display_name: string | null
  role: string | null
  disabled: boolean | null
  unidades: string[] | string | null
}

function normalizeUnidadSlugs(value: UserWithRolesRow['unidades']): string[] {
  const raw = Array.isArray(value)
    ? value
    : String(value ?? '')
      .replace(/[{}"]/g, '')
      .split(',')

  return raw.map(u => u.trim().toLowerCase()).filter(Boolean)
}

function hasOnlyMiceUnidad(value: UserWithRolesRow['unidades']): boolean {
  const unidades = normalizeUnidadSlugs(value)
  return unidades.length === 1 && unidades[0] === 'mice'
}

/** Perfil NA en td_profiles (valor por defecto del tiqueteador). */
export function isTiqueteadorNaLabel(label: string): boolean {
  const n = label.trim().toLowerCase().replace(/\s+/g, '')
  return n === 'na' || n === 'n/a' || n === 'noaplica'
}

export function sortTiqueteadorOptions(list: TiqueteadorOption[]): TiqueteadorOption[] {
  return [...list].sort((a, b) => {
    const aNa = isTiqueteadorNaLabel(a.label)
    const bNa = isTiqueteadorNaLabel(b.label)
    if (aNa && !bNa) return -1
    if (!aNa && bNa) return 1
    return a.label.localeCompare(b.label, 'es')
  })
}

export function findTiqueteadorNaOption(list: TiqueteadorOption[]): TiqueteadorOption | undefined {
  return list.find(u => isTiqueteadorNaLabel(u.label))
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

/**
 * Solo columnas ID/código + datos de negocio.
 * Solo FKs y datos de negocio; relaciones N:M en tablas hijas.
 */
export function formToPayload(
  form: SolicitudMiceForm,
  userId: string,
  catalog: MiceCatalogos
): Record<string, unknown> {
  const estadoId = pickEstadoIdForSave(form.estado_id, form.estado, catalog)
  const probabilidadId = pickProbabilidadIdForSave(form.probabilidad_id, form.probabilidad, catalog)
  const sectorId =
    form.sector_id ?? (form.sector.trim() ? resolveSectorId(form.sector, catalog) : null)

  return {
    user_id: userId,
    responsable_id: form.responsable_id.trim() || userId,
    anio: form.anio,
    cliente_id: form.cliente_id,
    sector_id: sectorId,
    mzp: (() => {
      const code = mzpFromSuffix(mzpSuffix(form.mzp))
      return code || null
    })(),
    nombre: form.nombre.trim(),
    inicio: emptyToNull(form.inicio),
    fin: emptyToNull(form.fin),
    estado_id: estadoId,
    probabilidad_id: probabilidadId,
    moneda_cotizacion: form.moneda_cotizacion,
    tiqueteador_user_id: form.tiqueteador_user_id.trim() || null,
    valor_cotizado: parseNum(form.valor_cotizado),
    utilidad_proyectada: parseNum(form.utilidad_proyectada),
    fecha_solicitud: form.fecha_solicitud,
    fecha_entrega: emptyToNull(form.fecha_entrega),
    pax: form.pax.trim() ? parseInt(form.pax, 10) : null,
    valor_final_aprobado: parseNum(form.valor_final_aprobado),
    utilidad_real: parseNum(form.utilidad_real),
  }
}

export function rowToForm(
  row: SolicitudMiceRow | SolicitudMiceRowDb,
  catalog?: MiceCatalogos,
  relaciones?: SolicitudMiceRelaciones | null,
  clienteNombreById?: Map<number, string>,
  profileNombreById?: Map<string, string>
): SolicitudMiceForm {
  const cat = catalog ?? MICE_CATALOGOS_VACIOS
  const anios = cat.anios
  const anioDefault = anios[0] ?? ANIO_MICE_DEFAULT
  const legacy = row as SolicitudMiceRowDb & {
    estado_codigo?: string | null
    estado?: string | null
    probabilidad_codigo?: string | null
    probabilidad?: string | null
  }
  const estadoId = resolveEstadoIdFromLegacy(
    row.estado_id,
    legacy.estado_codigo,
    legacy.estado,
    cat
  )
  const probabilidadId = resolveProbabilidadIdFromLegacy(
    row.probabilidad_id,
    legacy.probabilidad_codigo,
    legacy.probabilidad,
    cat
  )
  const rowDb: SolicitudMiceRowDb = { ...row, estado_id: estadoId, probabilidad_id: probabilidadId }
  const enriched =
    'responsable_nombre' in row
      ? {
          ...row,
          estado_id: estadoId,
          estado: resolveEstadoNombre(estadoId, cat, row.estado),
          probabilidad_id: probabilidadId,
          probabilidad: resolveProbabilidadNombre(probabilidadId, cat, row.probabilidad),
        }
      : enrichMiceRowDisplay(rowDb, cat, { clienteNombreById, profileNombreById })

  return {
    anio: anios.includes(enriched.anio) ? enriched.anio : anioDefault,
    responsable_id: enriched.responsable_id ?? '',
    responsable_nombre: enriched.responsable_nombre,
    cliente_id: enriched.cliente_id ?? null,
    cliente: enriched.cliente,
    sector_id: enriched.sector_id ?? null,
    sector: enriched.sector ?? '',
    mzp: enriched.mzp ?? '',
    nombre: enriched.nombre,
    inicio: toDateInputValue(enriched.inicio),
    fin: toDateInputValue(enriched.fin),
    estado_id: enriched.estado_id ?? null,
    estado: enriched.estado,
    valor_cotizado: enriched.valor_cotizado != null ? formatDecimalCO(enriched.valor_cotizado) : '',
    moneda_cotizacion: enriched.moneda_cotizacion ?? 'COP',
    utilidad_proyectada:
      enriched.utilidad_proyectada != null ? formatDecimalCO(enriched.utilidad_proyectada) : '',
    fecha_solicitud: enriched.fecha_solicitud,
    fecha_entrega: enriched.fecha_entrega ?? '',
    servicios: relaciones?.servicios ?? [],
    pax: enriched.pax != null ? String(enriched.pax) : '',
    lugares: relaciones?.lugares ?? [],
    destinos: relaciones?.destinos ?? [],
    tiqueteador_user_id: enriched.tiqueteador_user_id ?? '',
    tiqueteador_asignado: enriched.tiqueteador_asignado ?? '',
    probabilidad_id: enriched.probabilidad_id ?? null,
    probabilidad: enriched.probabilidad ?? '',
    valor_final_aprobado: enriched.valor_final_aprobado != null ? formatDecimalCO(enriched.valor_final_aprobado) : '',
    utilidad_real: enriched.utilidad_real != null ? formatDecimalCO(enriched.utilidad_real) : '',
    facturas: relaciones?.facturas ?? [],
  }
}

async function fetchProfileNombreById(): Promise<Map<string, string>> {
  const { data } = await supabase.from('td_profiles').select('id, display_name')
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    const r = row as { id: string; display_name: string | null }
    if (r.display_name?.trim()) map.set(r.id, r.display_name.trim())
  }
  return map
}

export async function listSolicitudesMice(
): Promise<{ data: SolicitudMiceRow[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('fecha_solicitud', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return { data: null, error: error.message }

  const clienteIds = Array.from(new Set(
    (data as SolicitudMiceRowDb[])
      .map(r => r.cliente_id)
      .filter((id): id is number => id != null)
  ))

  const [{ data: catalogData }, { data: clientesCatalog }, profileNombreById] = await Promise.all([
    fetchMiceCatalogos(),
    fetchClientesByIds(clienteIds),
    fetchProfileNombreById(),
  ])
  const clienteNombreById = buildClienteNombreById(clientesCatalog)
  const rows = (data as SolicitudMiceRowDb[]).map(r =>
    enrichMiceRowDisplay(r, catalogData, { clienteNombreById, profileNombreById })
  )

  return { data: rows, error: null }
}

export async function loadSolicitudForEdit(
  row: SolicitudMiceRow | SolicitudMiceRowDb,
  catalog: MiceCatalogos,
  clienteNombreById?: Map<number, string>,
  profileNombreById?: Map<string, string>
): Promise<{ form: SolicitudMiceForm; error: string | null }> {
  const { data: rel, error } = await fetchSolicitudRelaciones(row.id)
  if (error) {
    return { form: rowToForm(row, catalog, undefined, clienteNombreById, profileNombreById), error }
  }
  return { form: rowToForm(row, catalog, rel, clienteNombreById, profileNombreById), error: null }
}

export async function saveSolicitudMice(
  form: SolicitudMiceForm,
  userId: string,
  /** Nombre del usuario logueado que realiza el cambio (para auditoría y seguimientos). */
  autorNombre: string,
  catalog: MiceCatalogos,
  editId?: string,
  primerSeguimiento?: string,
  formAntesEdicion?: SolicitudMiceForm | null
): Promise<{ error: string | null; id?: string; auditWarning?: string | null }> {
  let formForSave = form
  if (!editId) {
    const next = await resolveNextMzpCode()
    if (next.error && !next.code) return { error: next.error }
    if (next.code) formForSave = { ...form, mzp: next.code }
  }

  const estadoIdSave = pickEstadoIdForSave(formForSave.estado_id, formForSave.estado, catalog)
  if ((formForSave.estado_id != null || formForSave.estado.trim()) && estadoIdSave == null) {
    return { error: 'El estado seleccionado no existe en el catálogo. Recargue la página o contacte al administrador.' }
  }
  const sectorIdSave =
    formForSave.sector_id ??
    (formForSave.sector.trim() ? resolveSectorId(formForSave.sector, catalog) : null)
  if (formForSave.sector.trim() && sectorIdSave == null) {
    return { error: 'El sector seleccionado no existe en el catálogo.' }
  }
  const probIdSave = pickProbabilidadIdForSave(
    formForSave.probabilidad_id,
    formForSave.probabilidad,
    catalog
  )
  if ((formForSave.probabilidad_id != null || formForSave.probabilidad.trim()) && probIdSave == null) {
    return { error: 'La probabilidad seleccionada no es válida en el catálogo.' }
  }
  if (formForSave.cliente_id == null) {
    return { error: 'Seleccione un cliente.' }
  }

  const payload = formToPayload(formForSave, userId, catalog)

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
        autorNombre,
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
    const seg = await addSeguimientoMice(newId, userId, autorNombre, segText)
    if (seg.error) return { error: seg.error, id: newId }
  }

  // Registrar auditoría de creación con todos los campos iniciales
  const observacionCreacion = buildAuditoriaMiceCreacion(form, catalog)
  if (observacionCreacion) {
    await registrarAuditoriaEdicion('solicitudes-mice', newId, userId, autorNombre, observacionCreacion)
  }

  return { error: null, id: newId }
}

export async function fetchUsuariosTiqueteador(): Promise<{
  data: { value: string; label: string }[]
  error: string | null
}> {
  const { data, error } = await supabase.rpc('list_users_with_roles')

  if (error) return { data: [], error: error.message }

  const list = sortTiqueteadorOptions(
    ((data ?? []) as UserWithRolesRow[])
      .filter(row => Boolean(row.display_name?.trim()))
      .filter(row => row.disabled !== true)
      .filter(row => row.role?.trim().toLowerCase() === 'tiqueteador')
      .filter(row => hasOnlyMiceUnidad(row.unidades))
      .map(row => ({
        value: row.id,
        label: row.display_name!.trim(),
      }))
  )

  return { data: list, error: null }
}

export async function fetchUsuariosResponsablesMice(): Promise<{
  data: { value: string; label: string }[]
  error: string | null
}> {
  const { data, error } = await supabase.rpc('list_responsables_mice')

  if (error) return { data: [], error: error.message }

  const list = ((data ?? []) as { id: string; display_name: string }[]).map(row => ({
    value: row.id,
    label: row.display_name.trim(),
  }))

  return { data: list, error: null }
}

export async function fetchSectoresMice(): Promise<string[]> {
  const { data } = await supabase.from('td_sectores').select('nombre').order('nombre')
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
