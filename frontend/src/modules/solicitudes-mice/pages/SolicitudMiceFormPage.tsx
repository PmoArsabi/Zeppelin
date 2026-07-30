import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import {
  codigoToEtapa,
  siguienteEtapa,
  labelEtapa,
  mostrarSeccionCotizacion,
  mostrarSeccionOperacion,
  mostrarSeccionCierre,
  puedeAvanzar,
  type EtapaMice,
} from '../lib/etapasMice'
import { buildClienteNombreById, fetchClientesZeppelinCatalog } from '@/lib/clientes'
import ClienteCustomSelect from '@/components/ui/ClienteCustomSelect'
import { formatDecimalCO, parseDecimalCO } from '@/lib/decimalFormat'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import FormField from '@/components/ui/FormField'
import PageTitle from '@/components/ui/PageTitle'
import Input from '@/components/ui/Input'
import DecimalInput from '@/components/ui/DecimalInput'
import YearInput from '@/components/ui/YearInput'
import CustomSelect from '@/components/ui/CustomSelect'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import SaveFeedbackOverlay, { type SaveFeedbackState } from '@/components/ui/SaveFeedbackOverlay'
import {
  INITIAL_FORM_MICE,
  FACTURA_REGEX,
  RECIBO_CAJA_REGEX,
  type SolicitudMiceForm,
  type SolicitudMiceEdit,
  type MonedaCotizacion,
} from '../types'
import type { MiceCatalogos } from '../types/mice-catalogos'
import { MICE_CATALOGOS_VACIOS } from '../types/mice-catalogos'
import { facturaCorrespondeCliente, fetchFacturasAnticipo } from '../services/facturaAnticipoService'
import {
  loadSolicitudForEdit,
  saveSolicitudMice,
  fetchSectoresMice,
  fetchUsuariosTiqueteador,
  fetchUsuariosResponsablesMice,
  findTiqueteadorNaOption,
  formatSectorNombre,
} from '../services/solicitudesMiceService'
import { resolveNextMzpCode } from '../services/mzpConsecutivoService'
import { fetchMiceCatalogos } from '../services/miceCatalogosService'
import DestinosMiceEditor from '../components/DestinosMiceEditor'
import FacturasMiceEditor from '../components/FacturasMiceEditor'
import LugarMiceSelect from '../components/LugarMiceSelect'
import ServiciosMiceSelect from '../components/ServiciosMiceSelect'
import SeguimientoMiceChat from '../components/SeguimientoMiceChat'
import AuditoriaPanel from '@/components/auditoria/AuditoriaPanel'

function cloneFormMice(f: SolicitudMiceForm): SolicitudMiceForm {
  return JSON.parse(JSON.stringify(f)) as SolicitudMiceForm
}

type Errors = Partial<Record<keyof SolicitudMiceForm, string>>

function validate(form: SolicitudMiceForm, catalog: MiceCatalogos, etapa: EtapaMice | null, isEdit: boolean): Errors {
  const ETAPAS_CON_COTIZACION = ['cotizacion_enviada','seguimiento','en_operacion','en_cierre','cerrado','no_adjudicado','cancelado']
  const ETAPAS_CON_OPERACION  = ['en_operacion','en_cierre','cerrado']
  const ETAPAS_CON_CIERRE     = ['en_cierre','cerrado']
  const seccionCotizacion = isEdit ? mostrarSeccionCotizacion(etapa) : ETAPAS_CON_COTIZACION.includes(etapa ?? '')
  const seccionOperacion  = isEdit ? mostrarSeccionOperacion(etapa)  : ETAPAS_CON_OPERACION.includes(etapa ?? '')
  const seccionCierre     = isEdit ? mostrarSeccionCierre(etapa)     : ETAPAS_CON_CIERRE.includes(etapa ?? '')
  const facturasObligatorias = etapa === 'cerrado'
  const e: Errors = {}
  if (!catalog.anios.includes(form.anio)) e.anio = 'Seleccione un año válido.'
  if (!form.responsable_id.trim()) e.responsable_id = 'Seleccione un responsable.'
  if (form.cliente_id == null) e.cliente_id = 'Seleccione un cliente.'
  if (form.sector_id == null && !form.sector.trim()) e.sector = 'Seleccione un sector.'
  if (!form.nombre.trim()) e.nombre = 'El nombre del evento es obligatorio.'
  if (form.estado_id == null && !form.estado.trim()) e.estado = 'Seleccione un estado.'
  else if (form.estado_id != null && !catalog.estados.some(x => x.id === form.estado_id)) {
    e.estado = 'Seleccione un estado válido.'
  }
  if (!form.fecha_solicitud) e.fecha_solicitud = 'La fecha de solicitud es obligatoria.'
  if (form.inicio && form.fin && form.fin < form.inicio) {
    e.fin = 'Debe ser igual o posterior a la fecha de inicio.'
  }
  if (seccionOperacion) {
    if (!form.inicio) e.inicio = 'La fecha de inicio es obligatoria en esta etapa.'
    if (!form.fin) e.fin = 'La fecha de fin es obligatoria en esta etapa.'
  }
  if (form.pax.trim()) {
    const p = parseInt(form.pax, 10)
    if (!Number.isFinite(p) || p < 0) e.pax = 'PAX debe ser un número válido.'
  }
  const mzp = form.mzp.trim()
  if (!mzp) e.mzp = 'El código MZP es obligatorio.'
  else if (!/^MZP\d{1,3}$/.test(mzp)) e.mzp = 'Use MZP y hasta 3 dígitos (ej. MZP001).'
  if (form.servicios.length === 0) e.servicios = 'Agregue al menos un servicio.'
  if (form.destinos.length === 0) e.destinos = 'Agregue al menos un destino (país y ciudad).'

  const tieneTiquetes = form.servicios.includes('SRV-01')
  if (tieneTiquetes && !form.tiqueteador_user_id.trim()) {
    e.tiqueteador_user_id = 'Seleccione un tiqueteador (hay tiquetes en los servicios).'
  }

  if (seccionCotizacion) {
    if (!form.valor_cotizado.trim()) e.valor_cotizado = 'Ingrese el valor cotizado.'
    else if (parseDecimalCO(form.valor_cotizado) == null) e.valor_cotizado = 'Valor cotizado inválido.'
    if (!form.utilidad_proyectada.trim()) e.utilidad_proyectada = 'Ingrese la utilidad proyectada.'
    else if (parseDecimalCO(form.utilidad_proyectada) == null) e.utilidad_proyectada = 'Utilidad proyectada inválida.'
    if (form.fecha_entrega && form.fecha_solicitud && form.fecha_entrega < form.fecha_solicitud) {
      e.fecha_entrega = 'Debe ser igual o posterior a la fecha de solicitud.'
    }
    if (form.probabilidad_id == null && !form.probabilidad.trim()) e.probabilidad = 'Seleccione una probabilidad.'
    else if (form.probabilidad_id != null && !catalog.probabilidades.some(p => p.id === form.probabilidad_id)) {
      e.probabilidad = 'Seleccione una probabilidad válida.'
    }
  } else {
    if (form.valor_cotizado.trim() && parseDecimalCO(form.valor_cotizado) == null) e.valor_cotizado = 'Valor cotizado inválido.'
    if (form.utilidad_proyectada.trim() && parseDecimalCO(form.utilidad_proyectada) == null) e.utilidad_proyectada = 'Utilidad proyectada inválida.'
    if (form.fecha_entrega && form.fecha_solicitud && form.fecha_entrega < form.fecha_solicitud) {
      e.fecha_entrega = 'Debe ser igual o posterior a la fecha de solicitud.'
    }
  }

  if (seccionCierre) {
    if (facturasObligatorias && form.facturas.length === 0) {
      e.facturas = 'Agregue al menos una factura.'
    } else if (form.facturas.length > 0) {
      const numeros = form.facturas.map(f => f.numero.trim().toUpperCase())
      if (numeros.some(n => !FACTURA_REGEX.test(n))) {
        e.facturas = 'Hay facturas con formato inválido. Ej: ABCD1234'
      } else if (new Set(numeros).size !== numeros.length) {
        e.facturas = 'Hay facturas duplicadas.'
      } else if (form.facturas.some(f => f.recibo_caja_numero && !RECIBO_CAJA_REGEX.test(f.recibo_caja_numero.trim().toUpperCase()))) {
        e.facturas = 'Hay recibos de caja con formato inválido. Ej: AB1234'
      }
    }
  }

  if (seccionOperacion) {
    if (!form.valor_final_aprobado.trim()) e.valor_final_aprobado = 'Ingrese el valor final aprobado.'
    else if (parseDecimalCO(form.valor_final_aprobado) == null) e.valor_final_aprobado = 'Valor inválido.'
    if (!form.utilidad_real.trim()) e.utilidad_real = 'Ingrese la utilidad real.'
    else if (parseDecimalCO(form.utilidad_real) == null) e.utilidad_real = 'Valor inválido.'
  }

  return e
}

/** Valida que las facturas del Cierre existan en raw.xmart_informe_acumulado_bks. */
async function validateFacturasEnInforme(
  form: SolicitudMiceForm,
  seccionCierre: boolean,
  exigirTotalMinimo = false
): Promise<string | null> {
  if (!seccionCierre || form.facturas.length === 0) return null
  const numeros = form.facturas.map(f => f.numero.trim().toUpperCase())
  const { data, error } = await fetchFacturasAnticipo(numeros)
  if (error) return `No se pudo validar las facturas contra el informe acumulado: ${error}`
  const faltantes = numeros.filter(n => !data.get(n)?.existe)
  if (faltantes.length > 0) {
    return `Las siguientes facturas no existen en el informe acumulado: ${faltantes.join(', ')}`
  }

  const clienteIncorrecto = numeros.filter(numero => {
    const estado = data.get(numero)
    return estado != null && !facturaCorrespondeCliente(estado, form.cliente_id)
  })
  if (clienteIncorrecto.length > 0) {
    return `Las siguientes facturas no corresponden al cliente seleccionado: ${clienteIncorrecto.join(', ')}`
  }

  if (exigirTotalMinimo) {
    const valorAprobado = parseDecimalCO(form.valor_final_aprobado)
    if (valorAprobado != null) {
      const total = Array.from(new Set(numeros)).reduce(
        (acc, numero) => acc + (data.get(numero)?.totalConTa ?? 0),
        0
      )
      if (total < valorAprobado) {
        return `El total facturado (${formatDecimalCO(total)}) es menor que el valor final aprobado (${formatDecimalCO(valorAprobado)}). No es posible cerrar la solicitud.`
      }
    }
  }

  return null
}

type FormTabId = 'cotizacion' | 'seguimiento' | 'historial'

const FORM_TABS: { id: FormTabId; label: string }[] = [
  { id: 'cotizacion', label: 'Cotización' },
  { id: 'seguimiento', label: 'Seguimiento' },
  { id: 'historial', label: 'Historial de cambios' },
]

function FormSection({
  step,
  title,
  description,
  headerAside,
  children,
}: {
  step?: number
  title: string
  description?: string
  /** Contenido a la derecha del título (ej. código MZP) */
  headerAside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="px-5 sm:px-7 py-6">
      <div className="flex items-center justify-between gap-4 mb-5 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          {step != null && (
            <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center ring-1 ring-indigo-200 dark:ring-indigo-500/30">
              {step}
            </span>
          )}
          <div className="min-w-0">
            <PageTitle as="h3" size="section">{title}</PageTitle>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {headerAside}
      </div>
      {children}
    </section>
  )
}

interface Props {
  editTarget: SolicitudMiceEdit | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
}

export default function SolicitudMiceFormPage({
  editTarget,
  readOnly = false,
  onSaved,
  onCancel,
}: Props) {
  const { user, displayName: currentUserName, isAdmin } = useAuth()
  const isEdit = editTarget !== null
  const lock = readOnly
  const mzpAuto = !isEdit && !lock
  /** En edición no se modifican cliente, sector ni fecha de solicitud (dato de registro). */
  const lockRegistro = isEdit && !lock

  const [form, setForm] = useState<SolicitudMiceForm>(INITIAL_FORM_MICE)
  const [errors, setErrors] = useState<Errors>({})
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedbackState | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [clientesCatalog, setClientesCatalog] = useState<{ id: number; fullname: string }[]>([])
  const [clientesError, setClientesError] = useState<string | null>(null)
  const [sectores, setSectores] = useState<string[]>([])
  const [usuariosTiqueteador, setUsuariosTiqueteador] = useState<{ value: string; label: string }[]>([])
  const [usuariosTiqueteadorError, setUsuariosTiqueteadorError] = useState<string | null>(null)
  const [usuariosResponsableMice, setUsuariosResponsableMice] = useState<{ value: string; label: string }[]>([])
  const [usuariosResponsableMiceError, setUsuariosResponsableMiceError] = useState<string | null>(null)
  const [usuariosResponsableMiceLoaded, setUsuariosResponsableMiceLoaded] = useState(false)
  const [catalog, setCatalog] = useState<MiceCatalogos>(MICE_CATALOGOS_VACIOS)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogWarning, setCatalogWarning] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(() => editTarget !== null)
  const [pendingSeguimiento, setPendingSeguimiento] = useState('')
  const [solicitudId, setSolicitudId] = useState<string | null>(editTarget?.id ?? null)
  const [formBaseline, setFormBaseline] = useState<SolicitudMiceForm | null>(null)
  const [activeTab, setActiveTab] = useState<FormTabId>('cotizacion')
  const [mzpLoading, setMzpLoading] = useState(false)
  const [facturasClienteMismatch, setFacturasClienteMismatch] = useState(false)
  const [totalFacturado, setTotalFacturado] = useState<number | null>(null)

  const formBusy = saveFeedback !== null
  const isSaving = saveFeedback?.status === 'saving'
  /** Edición: esperar catálogo + relaciones (servicios, destinos…) sin banner parpadeante */
  const formHydrating = isEdit && (catalogLoading || editLoading)

  /**
   * Etapa derivada del estado actual.
   * Prioriza el catálogo cargado; si aún no cargó y hay un editTarget,
   * intenta derivar la etapa desde el nombre del estado (fallback seguro).
   */
  const etapaActual = useMemo<EtapaMice | null>(() => {
    // Fuente principal: estado resuelto via catálogo
    if (form.estado_id != null) {
      const estado = catalog.estados.find(e => e.id === form.estado_id)
      if (estado) return codigoToEtapa(estado.codigo)
    }
    // Fallback: intentar derivar desde el nombre de estado en el form
    // (útil mientras el catálogo carga en modo edición)
    if (form.estado) return codigoToEtapa(form.estado.toLowerCase().replace(/ /g, '_'))
    return null
  }, [catalog.estados, form.estado_id, form.estado])

  const tieneTiquetes = form.servicios.includes('SRV-01')
  const effectiveLock = lock
  /** El responsable solo puede modificarse al crear, o por un administrador */
  const lockResponsable = isEdit && !lock && !isAdmin
  /** En operación y posterior: valor cotizado, utilidad proyectada y fecha entrega son de solo lectura */
  const lockCotizacionFields = isEdit && ['en_operacion', 'en_cierre', 'cerrado'].includes(etapaActual ?? '')

  // Limpiar tiqueteador si se quita SRV-01 de los servicios
  useEffect(() => {
    if (!tieneTiquetes && form.tiqueteador_user_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(prev => ({ ...prev, tiqueteador_user_id: '', tiqueteador_asignado: '' }))
    }
  }, [tieneTiquetes, form.tiqueteador_user_id])

  /** Verifica si los campos requeridos para avanzar a la etapa siguiente están completos. */
  const puedeAvanzarAhora = useMemo(() => {
    if (!etapaActual) return false
    const siguiente = siguienteEtapa(etapaActual)
    if (!siguiente) return false
    // Ninguna factura asociada puede pertenecer a otro cliente
    if (facturasClienteMismatch) return false
    // Para avanzar a cotizacion_enviada: valor, utilidad y probabilidad obligatorios
    if (siguiente === 'cotizacion_enviada') {
      const valorOk = !!form.valor_cotizado.trim() && parseDecimalCO(form.valor_cotizado) != null
      const utilidadOk = !!form.utilidad_proyectada.trim() && parseDecimalCO(form.utilidad_proyectada) != null
      const probOk = form.probabilidad_id != null || !!form.probabilidad.trim()
      return valorOk && utilidadOk && probOk
    }
    // Para avanzar a en_operacion: campos de operación obligatorios
    if (siguiente === 'en_operacion') {
      const vfOk = !!form.valor_final_aprobado.trim() && parseDecimalCO(form.valor_final_aprobado) != null
      const urOk = !!form.utilidad_real.trim() && parseDecimalCO(form.utilidad_real) != null
      return vfOk && urOk
    }
    // Los anticipos son opcionales en operación y en cierre. Para cerrar,
    // debe existir al menos una factura y el total facturado debe cubrir
    // el valor final aprobado.
    if (siguiente === 'cerrado') {
      if (form.facturas.length === 0) return false
      const valorAprobado = parseDecimalCO(form.valor_final_aprobado)
      if (valorAprobado != null && totalFacturado != null && totalFacturado < valorAprobado) return false
      return true
    }
    return true
  }, [etapaActual, form.valor_cotizado, form.utilidad_proyectada, form.probabilidad_id, form.probabilidad, form.valor_final_aprobado, form.utilidad_real, form.facturas, facturasClienteMismatch, totalFacturado])

  useEffect(() => {
    if (saveFeedback?.status !== 'success') return
    const timer = window.setTimeout(() => onSaved(), 2000)
    return () => window.clearTimeout(timer)
  }, [saveFeedback, onSaved])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsuariosResponsableMiceLoaded(false)
    Promise.all([
      fetchClientesZeppelinCatalog(),
      fetchSectoresMice(),
      fetchUsuariosTiqueteador(
        editTarget?.tiqueteador_user_id && editTarget.tiqueteador_asignado
          ? { id: editTarget.tiqueteador_user_id, nombre: editTarget.tiqueteador_asignado }
          : undefined
      ),
      fetchUsuariosResponsablesMice(),
      fetchMiceCatalogos(),
    ]).then(([clientesRes, sectoresList, usuariosRes, responsablesRes, miceCat]) => {
      if (clientesRes.error) setClientesError(clientesRes.error)
      setClientesCatalog(clientesRes.data)
      setSectores(sectoresList)
      if (usuariosRes.error) setUsuariosTiqueteadorError(usuariosRes.error)
      setUsuariosTiqueteador(usuariosRes.data)
      if (responsablesRes.error) setUsuariosResponsableMiceError(responsablesRes.error)
      setUsuariosResponsableMice(responsablesRes.data)
      setUsuariosResponsableMiceLoaded(true)
      if (!editTarget) {
        const na = findTiqueteadorNaOption(usuariosRes.data)
        if (na) {
          setForm(prev =>
            prev.tiqueteador_user_id
              ? prev
              : { ...prev, tiqueteador_user_id: na.value, tiqueteador_asignado: na.label }
          )
        }
      }
      setCatalog(miceCat.data)
      if (miceCat.error) setCatalogWarning(miceCat.error)
      if (miceCat.data.anios.length > 0 && !editTarget) {
        setForm(prev => ({
          ...prev,
          anio: miceCat.data.anios.includes(prev.anio) ? prev.anio : miceCat.data.anios[0],
        }))
      }
      setCatalogLoading(false)
    })
  }, [editTarget])

  useEffect(() => {
    if (!user || editTarget || !usuariosResponsableMiceLoaded) return
    const responsable = usuariosResponsableMice.find(u => u.value === user.id)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(prev => {
      if (prev.responsable_id && prev.responsable_id !== user.id) return prev
      return {
        ...prev,
        responsable_id: responsable?.value ?? '',
        responsable_nombre: responsable?.label ?? '',
      }
    })
  }, [user, editTarget, usuariosResponsableMice, usuariosResponsableMiceLoaded])

  useEffect(() => {
    if (!usuariosResponsableMiceLoaded || !form.responsable_id) return
    const isAllowed = usuariosResponsableMice.some(u => u.value === form.responsable_id)
    if (isAllowed) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(prev => ({
      ...prev,
      responsable_id: '',
      responsable_nombre: '',
    }))
  }, [usuariosResponsableMiceLoaded, usuariosResponsableMice, form.responsable_id])

  // Nota: fetchUsuariosTiqueteador ya incluye el tiqueteador actual del registro (aunque esté
  // inactivo o haya cambiado de rol), así que no se limpia automáticamente al cargar edición.

  const profileNombreById = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of usuariosTiqueteador) m.set(u.value, u.label)
    for (const u of usuariosResponsableMice) m.set(u.value, u.label)
    return m
  }, [usuariosTiqueteador, usuariosResponsableMice])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSolicitudId(editTarget?.id ?? null)
    setPendingSeguimiento('')
    setFormBaseline(null)
    setActiveTab('cotizacion')
    setEditLoading(editTarget !== null)
  }, [editTarget])

  useEffect(() => {
    if (!editTarget || catalogLoading) return
    let cancelled = false
    loadSolicitudForEdit(
      editTarget,
      catalog,
      buildClienteNombreById(clientesCatalog),
      profileNombreById
    ).then(({ form: loaded, error }) => {
      if (cancelled) return
      setForm(loaded)
      setFormBaseline(cloneFormMice(loaded))
      if (error) setCatalogWarning(prev => prev ? `${prev} ${error}` : error)
      setEditLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [editTarget, catalog, catalogLoading, clientesCatalog, profileNombreById])
  /* eslint-enable react-hooks/set-state-in-effect */

  const applyNextMzp = useCallback(async () => {
    if (!mzpAuto) return
    setMzpLoading(true)
    const { code, error } = await resolveNextMzpCode()
    if (code) setForm(prev => ({ ...prev, mzp: code }))
    if (error) {
      setCatalogWarning(prev => (prev ? `${prev} ${error}` : error))
    }
    setMzpLoading(false)
  }, [mzpAuto])

  useEffect(() => {
    if (!mzpAuto) return
    void applyNextMzp() // eslint-disable-line react-hooks/set-state-in-effect
  }, [mzpAuto, applyNextMzp])

  const minAnio = catalog.anios.length ? Math.min(...catalog.anios) : 2025
  const maxAnio = catalog.anios.length ? Math.max(...catalog.anios) : 2026

  const set = <K extends keyof SolicitudMiceForm>(key: K, value: SolicitudMiceForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const fechaEntregaError = (entrega: string, solicitud: string): string | undefined => {
    if (entrega && solicitud && entrega < solicitud) {
      return 'Debe ser igual o posterior a la fecha de solicitud.'
    }
    return undefined
  }

  const setFechaSolicitud = (fecha: string) => {
    set('fecha_solicitud', fecha)
    const msg = fechaEntregaError(form.fecha_entrega, fecha)
    setErrors(prev => ({ ...prev, fecha_entrega: msg }))
  }


  const fechaFinError = (fin: string, inicio: string): string | undefined => {
    if (fin && inicio && fin < inicio) {
      return 'Debe ser igual o posterior a la fecha de inicio.'
    }
    return undefined
  }

  const setInicio = (fecha: string) => {
    set('inicio', fecha)
    setErrors(prev => ({ ...prev, fin: fechaFinError(form.fin, fecha) }))
  }

  const setFin = (fecha: string) => {
    set('fin', fecha)
    setErrors(prev => ({ ...prev, fin: fechaFinError(fecha, form.inicio) }))
  }

  const responsableOptions = useMemo(() => {
    return usuariosResponsableMice
  }, [usuariosResponsableMice])

  const setResponsable = (userId: string) => {
    const usuario = usuariosResponsableMice.find(u => u.value === userId)
    setForm(prev => ({
      ...prev,
      responsable_id: userId,
      responsable_nombre: usuario?.label ?? (userId ? prev.responsable_nombre : ''),
    }))
    if (errors.responsable_id) {
      setErrors(prev => ({ ...prev, responsable_id: undefined, responsable_nombre: undefined }))
    }
  }

  const tiqueteadorOptions = useMemo(() => {
    return usuariosTiqueteador
  }, [usuariosTiqueteador])

  const sectorOptions = useMemo(() => {
    const base = catalog.sectores.map(s => ({
      value: String(s.id),
      label: formatSectorNombre(s.nombre),
    }))
    if (form.sector_id != null && !base.some(o => o.value === String(form.sector_id))) {
      return [{ value: String(form.sector_id), label: form.sector || 'Sector anterior' }, ...base]
    }
    return base
  }, [catalog.sectores, form.sector_id, form.sector])

const estadoOptions = useMemo(() => {
    const base = catalog.estados.map(s => ({ value: String(s.id), label: s.nombre }))
    if (form.estado_id != null && !base.some(o => o.value === String(form.estado_id))) {
      return [{ value: String(form.estado_id), label: form.estado || 'Estado anterior' }, ...base]
    }
    return base
  }, [catalog.estados, form.estado_id, form.estado])

  const probabilidadOptions = useMemo(() => {
    const base = catalog.probabilidades.map(p => ({ value: String(p.id), label: p.nombre }))
    if (form.probabilidad_id != null && !base.some(o => o.value === String(form.probabilidad_id))) {
      return [{ value: String(form.probabilidad_id), label: form.probabilidad || 'Probabilidad anterior' }, ...base]
    }
    return base
  }, [catalog.probabilidades, form.probabilidad_id, form.probabilidad])

  const setTiqueteador = (userId: string) => {
    const usuario = usuariosTiqueteador.find(u => u.value === userId)
    setForm(prev => ({
      ...prev,
      tiqueteador_user_id: userId,
      tiqueteador_asignado: usuario?.label ?? (userId ? prev.tiqueteador_asignado : ''),
    }))
    if (errors.tiqueteador_user_id) {
      setErrors(prev => ({ ...prev, tiqueteador_user_id: undefined, tiqueteador_asignado: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (effectiveLock || formBusy) return
    setSubmitError(null)
    const v = validate(form, catalog, etapaActual, isEdit)
    if (Object.keys(v).length > 0) {
      setErrors(v)
      setActiveTab('cotizacion')
      return
    }
    if (!usuariosResponsableMice.some(u => u.value === form.responsable_id)) {
      setErrors({ responsable_id: 'Seleccione un responsable de unidad MICE.' })
      setActiveTab('cotizacion')
      return
    }
    if (tieneTiquetes && !usuariosTiqueteador.some(u => u.value === form.tiqueteador_user_id)) {
      setErrors({ tiqueteador_user_id: 'Seleccione un tiqueteador de unidad MICE.' })
      setActiveTab('cotizacion')
      return
    }
    if (!user) return
    if (catalog.servicios.length === 0 || catalog.paises.length === 0) {
      setSubmitError('Los catálogos MICE no están disponibles. Verifique las migraciones en Supabase.')
      return
    }

    const facturasError = await validateFacturasEnInforme(form, mostrarSeccionCierre(etapaActual))
    if (facturasError) {
      setErrors({ facturas: facturasError })
      setActiveTab('cotizacion')
      return
    }

    setSaveFeedback({
      status: 'saving',
      title: isEdit ? 'Guardando cambios...' : 'Registrando solicitud MICE...',
    })

    const formWithResponsable = {
      ...form,
      responsable_nombre: form.responsable_nombre.trim() || user.email || 'Usuario',
    }
    try {
      const { error, id: savedId, auditWarning } = await saveSolicitudMice(
        formWithResponsable,
        user.id,
        currentUserName || user.email || 'Usuario',
        catalog,
        isEdit ? editTarget!.id : undefined,
        !isEdit ? pendingSeguimiento : undefined,
        isEdit && formBaseline ? formBaseline : null
      )
      if (error) {
        const detail = error.includes('does not exist') || error.includes('schema cache')
          ? 'La tabla th_solicitud_mice no existe aún. Ejecuta database/MICE_LIMPIAR_COLUMNAS_CABECERA.sql en Supabase.'
          : error
        setSubmitError(detail)
        setSaveFeedback({ status: 'error', title: 'No se pudo guardar', detail })
        return
      }
      if (auditWarning) {
        setCatalogWarning(prev => (prev ? `${prev} ` : '') + auditWarning)
      }
      if (savedId && !isEdit) setSolicitudId(savedId)
      setSaveFeedback({
        status: 'success',
        title: isEdit ? 'Cambios guardados correctamente' : 'Solicitud registrada correctamente',
      })
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : 'Error al guardar.'
      setSubmitError(detail)
      setSaveFeedback({ status: 'error', title: 'No se pudo guardar', detail })
    }
  }

  const handleAvanzarEtapa = async () => {
    if (!solicitudId || !etapaActual || !user) return
    const siguiente = siguienteEtapa(etapaActual)
    if (!siguiente) return
    const estadoSiguiente = catalog.estados.find(e => codigoToEtapa(e.codigo) === siguiente)
    if (!estadoSiguiente) return

    const formAvanzado: SolicitudMiceForm = {
      ...form,
      estado_id: estadoSiguiente.id,
      estado: estadoSiguiente.nombre,
      // Fecha de entrega automática al pasar a cotización enviada
      ...(siguiente === 'cotizacion_enviada' && !form.fecha_entrega
        ? { fecha_entrega: new Date().toISOString().slice(0, 10) }
        : {}),
    }

    // Al avanzar etapa se valida contra la etapa destino SIN pre-carga (isEdit=false)
    // para que solo sean obligatorios los campos que esa etapa realmente requiere
    const v = validate(formAvanzado, catalog, siguiente, false)
    if (Object.keys(v).length > 0) {
      setErrors(v)
      setActiveTab('cotizacion')
      setSubmitError(`Complete los campos requeridos para avanzar a "${labelEtapa(siguiente)}".`)
      return
    }

    const facturasError = await validateFacturasEnInforme(
      formAvanzado,
      mostrarSeccionCierre(siguiente),
      siguiente === 'cerrado'
    )
    if (facturasError) {
      setErrors({ facturas: facturasError })
      setActiveTab('cotizacion')
      setSubmitError(facturasError)
      return
    }

    setSaveFeedback({ status: 'saving', title: `Avanzando a "${labelEtapa(siguiente)}"...` })
    setForm(formAvanzado)

    try {
      const { error, auditWarning } = await saveSolicitudMice(
        formAvanzado,
        user.id,
        currentUserName || user.email || 'Usuario',
        catalog,
        solicitudId,
        undefined,
        formBaseline
      )
      if (error) {
        setSaveFeedback({ status: 'error', title: 'No se pudo avanzar', detail: error })
        return
      }
      if (auditWarning) setCatalogWarning(prev => (prev ? `${prev} ` : '') + auditWarning)
      setFormBaseline(cloneFormMice(formAvanzado))
      setSaveFeedback({ status: 'success', title: `Avanzado a "${labelEtapa(siguiente)}" correctamente` })
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : 'Error al avanzar.'
      setSaveFeedback({ status: 'error', title: 'No se pudo avanzar', detail })
    }
  }

  const nav = (
    <button
      type="button"
      onClick={onCancel}
      disabled={formBusy}
      className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400
                 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-1.5
                 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60
                 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {lock ? 'Volver al listado' : isEdit ? 'Editar cotización MICE' : 'Nueva Cotización MICE'}
    </button>
  )

  return (
    <div className="w-full min-w-0 px-4 sm:px-5 lg:px-6 py-8 sm:py-10">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {nav}
          {lock && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              Solo lectura
            </span>
          )}
        </div>

        {submitError && saveFeedback?.status !== 'error' && (
          <Alert variant="error" className="mb-6">{submitError}</Alert>
        )}
        {catalogWarning && <Alert variant="info" className="mb-6">{catalogWarning}</Alert>}
        {clientesError && <Alert variant="error" className="mb-6">{clientesError}</Alert>}
        {usuariosTiqueteadorError && <Alert variant="error" className="mb-6">{usuariosTiqueteadorError}</Alert>}
        {usuariosResponsableMiceError && <Alert variant="error" className="mb-6">{usuariosResponsableMiceError}</Alert>}

        <form onSubmit={handleSubmit} noValidate>
          <Card
            className={`overflow-hidden transition-opacity duration-150 ${
              formBusy || formHydrating ? 'pointer-events-none select-none opacity-70' : ''
            }`}
            aria-busy={formBusy || formHydrating}
          >
            <div className="flex items-end justify-between px-4 sm:px-6 pt-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex flex-wrap gap-1" role="tablist" aria-label="Secciones de la solicitud">
                {FORM_TABS.map(tab => {
                  const selected = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      disabled={formBusy}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        selected
                          ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300 bg-white dark:bg-slate-900'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-900/40'
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
              {(isEdit || form.mzp) && (
                <div className="flex items-center pb-px pl-4 shrink-0 self-center">
                  <span
                    className={`font-mono text-base font-bold tracking-widest text-indigo-600 dark:text-indigo-400 ${mzpLoading && mzpAuto ? 'opacity-40' : ''}`}
                    aria-label="Código MZP"
                    aria-live="polite"
                  >
                    {mzpLoading && mzpAuto ? '…' : form.mzp || '—'}
                  </span>
                  {errors.mzp && <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5 text-right">{errors.mzp}</p>}
                </div>
              )}
            </div>

            {activeTab === 'cotizacion' && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">

          <FormSection
            step={1}
            title="Información General"
            description="Cliente, responsable, fechas de gestión y datos del evento"
          >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <FormField label="Cliente" required htmlFor="cliente_id" error={errors.cliente_id}
                  className="sm:col-span-2 lg:col-span-2 min-w-0">
                  <ClienteCustomSelect
                    value={form.cliente_id}
                    onChange={(id, fullname) => {
                      setForm(prev => ({ ...prev, cliente_id: id, cliente: fullname }))
                      if (errors.cliente_id) setErrors(prev => ({ ...prev, cliente_id: undefined }))
                    }}
                    error={!!errors.cliente_id}
                    disabled={effectiveLock || lockRegistro}
                  />
                </FormField>
                <FormField label="Sector" htmlFor="sector" required error={errors.sector} className="lg:col-span-1 min-w-0">
                  <CustomSelect
                    id="sector"
                    value={form.sector_id != null ? String(form.sector_id) : ''}
                    onChange={v => {
                      const id = v ? Number(v) : null
                      const item = catalog.sectores.find(s => s.id === id)
                      setForm(prev => ({
                        ...prev,
                        sector_id: id,
                        sector: item ? formatSectorNombre(item.nombre) : prev.sector,
                      }))
                    }}
                    placeholder="Seleccionar sector..."
                    error={!!errors.sector}
                    options={sectorOptions.length > 0 ? sectorOptions : sectores.map(s => ({ value: s, label: s }))}
                    disabled={effectiveLock || lockRegistro}
                    searchable
                  />
                </FormField>
                <FormField label="Estado" required htmlFor="estado" error={errors.estado}
                  className="lg:col-span-1 min-w-0">
                  <CustomSelect
                    id="estado"
                    value={form.estado_id != null ? String(form.estado_id) : ''}
                    onChange={v => {
                      const id = v ? Number(v) : null
                      const item = catalog.estados.find(e => e.id === id)
                      setForm(prev => ({
                        ...prev,
                        estado_id: id,
                        estado: (item?.nombre ?? prev.estado) as SolicitudMiceForm['estado'],
                      }))
                    }}
                    placeholder="Seleccionar estado..."
                    error={!!errors.estado}
                    options={estadoOptions}
                    disabled={effectiveLock || catalogLoading}
                  />
                </FormField>
                <FormField
                  label="Responsable"
                  required
                  htmlFor="responsable"
                  error={errors.responsable_id}
                  className="sm:col-span-2 lg:col-span-1 min-w-0"
                >
                  <CustomSelect
                    id="responsable"
                    value={form.responsable_id ?? ''}
                    onChange={setResponsable}
                    placeholder={
                      usuariosResponsableMiceError
                        ? 'Error al cargar responsables'
                        : usuariosResponsableMice.length === 0
                          ? 'Sin responsables MICE'
                          : 'Seleccionar responsable...'
                    }
                    options={responsableOptions}
                    searchable
                    error={!!errors.responsable_id}
                    disabled={effectiveLock || lockResponsable || !!usuariosResponsableMiceError}
                  />
                </FormField>
                <FormField label="Nombre (evento / grupo)" required htmlFor="nombre" error={errors.nombre}
                  className="sm:col-span-2 lg:col-span-3 min-w-0">
                  <Input id="nombre" type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)}
                    placeholder="Nombre del evento MICE" error={!!errors.nombre} disabled={effectiveLock} />
                </FormField>
                <FormField label="Fecha solicitud" required htmlFor="fecha_solicitud" error={errors.fecha_solicitud}
                  className="lg:col-span-1 min-w-0">
                  <Input id="fecha_solicitud" type="date" value={form.fecha_solicitud}
                    onChange={e => setFechaSolicitud(e.target.value)} error={!!errors.fecha_solicitud}
                    disabled={effectiveLock || lockRegistro}
                    className="scheme-light dark:scheme-dark" />
                </FormField>
                <FormField label="Año Evento" required htmlFor="anio" error={errors.anio}
                  className="lg:col-span-1 min-w-0">
                  <YearInput
                    id="anio"
                    value={form.anio}
                    onChange={y => set('anio', y)}
                    error={!!errors.anio}
                    minYear={minAnio}
                    maxYear={maxAnio}
                    disabled={effectiveLock || catalogLoading}
                  />
                </FormField>
                <FormField label="Fecha inicio" htmlFor="inicio" required={lockCotizacionFields} optional={!lockCotizacionFields} error={errors.inicio}
                  className="lg:col-span-1 min-w-0">
                  <Input
                    id="inicio"
                    type="date"
                    value={form.inicio}
                    onChange={e => setInicio(e.target.value)}
                    error={!!errors.inicio}
                    disabled={effectiveLock}
                    className="scheme-light dark:scheme-dark"
                  />
                </FormField>
                <FormField
                  label="Fecha fin"
                  htmlFor="fin"
                  required={lockCotizacionFields}
                  optional={!lockCotizacionFields}
                  error={errors.fin}
                  className="lg:col-span-1 min-w-0"
                  hint={form.inicio ? `Mínimo: ${form.inicio}` : undefined}
                >
                  <Input
                    id="fin"
                    type="date"
                    value={form.fin}
                    min={form.inicio || undefined}
                    onChange={e => setFin(e.target.value)}
                    error={!!errors.fin}
                    disabled={effectiveLock}
                    className="scheme-light dark:scheme-dark"
                  />
                </FormField>
              </div>
          </FormSection>

          <FormSection step={2} title="Detalle del evento" description="Servicios, ubicación y destinos">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <FormField
                  label="Servicios"
                  required
                  error={errors.servicios}
                  className="sm:col-span-2 lg:col-span-4"
                  hint="Seleccione y agregue servicios; se mostrarán unidos con +."
                >
                  <ServiciosMiceSelect
                    catalogo={catalog.servicios}
                    value={form.servicios}
                    onChange={servicios => set('servicios', servicios)}
                    error={!!errors.servicios}
                    readOnly={effectiveLock}
                  />
                </FormField>
                <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap gap-5 items-end sm:col-span-2 lg:col-span-4 w-full min-w-0">
                  <FormField
                    label="PAX"
                    htmlFor="pax"
                    optional
                    error={errors.pax}
                    className="w-full sm:w-28 shrink-0 min-w-0"
                  >
                    <Input id="pax" type="number" min={0} value={form.pax}
                      onChange={e => set('pax', e.target.value)} error={!!errors.pax} disabled={effectiveLock} />
                  </FormField>
                  <FormField label="Lugar" optional className="w-full sm:w-auto shrink-0 min-w-0">
                    <LugarMiceSelect
                      lugares={catalog.lugares}
                      value={form.lugares}
                      onChange={lugares => set('lugares', lugares)}
                      error={!!errors.lugares}
                      readOnly={effectiveLock}
                    />
                  </FormField>
                  {tieneTiquetes && (
                  <FormField
                    label="Tiqueteador"
                    htmlFor="tiqueteador"
                    required
                    error={errors.tiqueteador_user_id}
                    className="w-full sm:flex-1 sm:min-w-48 min-w-0"
                  >
                    <CustomSelect
                      id="tiqueteador"
                      value={form.tiqueteador_user_id ?? ''}
                      onChange={setTiqueteador}
                      placeholder={
                        usuariosTiqueteadorError
                          ? 'Error al cargar tiqueteadores'
                          : usuariosTiqueteador.length === 0
                            ? 'Sin tiqueteadores MICE'
                            : 'Seleccionar...'
                      }
                      error={!!errors.tiqueteador_user_id}
                      options={tiqueteadorOptions}
                      searchable
                      disabled={effectiveLock || catalogLoading || !!usuariosTiqueteadorError}
                    />
                  </FormField>
                  )}
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <FormField
                    label="Destinos"
                    required
                    error={errors.destinos}
                    hint="Seleccione país y ciudad; puede agregar varios destinos al evento."
                  >
                    <DestinosMiceEditor
                      catalog={catalog}
                      value={form.destinos}
                      onChange={destinos => set('destinos', destinos)}
                      readOnly={effectiveLock}
                    />
                  </FormField>
                </div>
              </div>
          </FormSection>

          {(isEdit ? mostrarSeccionCotizacion(etapaActual) : ['cotizacion_enviada','seguimiento','en_operacion','en_cierre','cerrado','no_adjudicado','cancelado'].includes(etapaActual ?? '')) && (
          <FormSection
            step={3}
            title="Cotización"
            description="Valor cotizado, utilidad proyectada y probabilidad"
          >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 items-end">
                <FormField
                  label="Valor cotizado"
                  htmlFor="valor_cotizado"
                  required={mostrarSeccionCotizacion(etapaActual)}
                  optional={!mostrarSeccionCotizacion(etapaActual)}
                  error={errors.valor_cotizado}
                  className="sm:col-span-1 lg:col-span-3 min-w-0"
                >
                  <div className="flex gap-2 min-w-0">
                    <div className="w-24 shrink-0">
                      <CustomSelect
                        id="moneda_cotizacion"
                        value={form.moneda_cotizacion}
                        onChange={v => set('moneda_cotizacion', v as MonedaCotizacion)}
                        disabled={effectiveLock || lockCotizacionFields}
                        options={catalog.monedas.map(m => ({ value: m.codigo, label: m.codigo }))}
                      />
                    </div>
                    <DecimalInput
                      id="valor_cotizado"
                      value={form.valor_cotizado}
                      onChange={v => set('valor_cotizado', v)}
                      placeholder="0"
                      className="min-w-0 flex-1"
                      error={!!errors.valor_cotizado}
                      disabled={effectiveLock || lockCotizacionFields}
                    />
                  </div>
                </FormField>
                <FormField
                  label="Utilidad proyectada"
                  htmlFor="utilidad"
                  required={mostrarSeccionCotizacion(etapaActual)}
                  optional={!mostrarSeccionCotizacion(etapaActual)}
                  error={errors.utilidad_proyectada}
                  className="sm:col-span-1 lg:col-span-3 min-w-0"
                >
                  <DecimalInput
                    id="utilidad"
                    value={form.utilidad_proyectada}
                    onChange={v => set('utilidad_proyectada', v)}
                    placeholder="0"
                    error={!!errors.utilidad_proyectada}
                    disabled={effectiveLock || lockCotizacionFields}
                  />
                </FormField>
                <FormField
                  label="% Ganancia proyectada"
                  className="sm:col-span-1 lg:col-span-2 min-w-0"
                >
                  {(() => {
                    const vc = parseDecimalCO(form.valor_cotizado)
                    const up = parseDecimalCO(form.utilidad_proyectada)
                    if (vc == null || up == null || vc === 0) {
                      return <p className="text-sm text-slate-400 dark:text-slate-500 py-2">—</p>
                    }
                    const pct = (up / vc) * 100
                    return (
                      <p className={`text-2xl font-bold py-1 ${pct >= 17 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {pct.toFixed(1)}%
                      </p>
                    )
                  })()}
                </FormField>
                <FormField
                  label="Probabilidad"
                  htmlFor="probabilidad"
                  required={mostrarSeccionCotizacion(etapaActual)}
                  optional={!mostrarSeccionCotizacion(etapaActual)}
                  error={errors.probabilidad}
                  className="sm:col-span-1 lg:col-span-4 min-w-0"
                >
                  <CustomSelect
                    id="probabilidad"
                    value={form.probabilidad_id != null ? String(form.probabilidad_id) : ''}
                    onChange={v => {
                      const id = v ? Number(v) : null
                      const item = catalog.probabilidades.find(p => p.id === id)
                      setForm(prev => ({
                        ...prev,
                        probabilidad_id: id,
                        probabilidad: (item?.nombre ?? prev.probabilidad) as SolicitudMiceForm['probabilidad'],
                      }))
                    }}
                    placeholder="Seleccionar..."
                    error={!!errors.probabilidad}
                    options={probabilidadOptions}
                    disabled={effectiveLock || catalogLoading}
                  />
                </FormField>
              </div>
          </FormSection>
          )}

          {(isEdit ? mostrarSeccionOperacion(etapaActual) : ['en_operacion','en_cierre','cerrado'].includes(etapaActual ?? '')) && (
          <FormSection
            step={4}
            title="En operación"
            description="Valor final aprobado, utilidad real y porcentaje de ganancia"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 items-end">
              <FormField
                label="Valor final aprobado"
                htmlFor="valor_final_aprobado"
                required
                error={errors.valor_final_aprobado}
                className="sm:col-span-1 lg:col-span-4 min-w-0"
              >
                <div className="flex gap-2 min-w-0">
                  <div className="w-24 shrink-0">
                    <CustomSelect
                      value={form.moneda_cotizacion}
                      onChange={v => set('moneda_cotizacion', v as MonedaCotizacion)}
                      disabled
                      options={catalog.monedas.map(m => ({ value: m.codigo, label: m.codigo }))}
                    />
                  </div>
                  <DecimalInput
                    id="valor_final_aprobado"
                    value={form.valor_final_aprobado}
                    onChange={v => set('valor_final_aprobado', v)}
                    placeholder="0"
                    className="min-w-0 flex-1"
                    error={!!errors.valor_final_aprobado}
                    disabled={effectiveLock}
                  />
                </div>
              </FormField>
              <FormField
                label="Utilidad real"
                htmlFor="utilidad_real"
                required
                error={errors.utilidad_real}
                className="sm:col-span-1 lg:col-span-4 min-w-0"
              >
                <DecimalInput
                  id="utilidad_real"
                  value={form.utilidad_real}
                  onChange={v => set('utilidad_real', v)}
                  placeholder="0"
                  error={!!errors.utilidad_real}
                  disabled={effectiveLock}
                />
              </FormField>
              <FormField
                label="% Ganancia (fee / markup)"
                className="sm:col-span-1 lg:col-span-4 min-w-0"
              >
                {(() => {
                  const vf = parseDecimalCO(form.valor_final_aprobado)
                  const ur = parseDecimalCO(form.utilidad_real)
                  if (vf == null || ur == null || vf === 0) {
                    return <p className="text-sm text-slate-400 dark:text-slate-500 py-2">—</p>
                  }
                  const pct = (ur / vf) * 100
                  return (
                    <p className={`text-2xl font-bold py-1 ${pct >= 17 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {pct.toFixed(1)}%
                    </p>
                  )
                })()}
              </FormField>
            </div>
          </FormSection>
          )}

          {(isEdit ? mostrarSeccionCierre(etapaActual) : ['en_cierre','cerrado'].includes(etapaActual ?? '')) && (
          <FormSection
            step={5}
            title="Cierre"
            description={
              etapaActual === 'en_operacion'
                ? 'Registre anticipos durante la operación; complete las facturas y recibos al realizar el cierre'
                : 'Facturas y recibos de caja del evento'
            }
          >
            <FormField
              label="Facturas y recibos de caja"
              error={errors.facturas}
              required={siguienteEtapa(etapaActual ?? 'en_cierre') === 'cerrado'}
            >
              <FacturasMiceEditor
                value={form.facturas}
                onChange={facturas => set('facturas', facturas)}
                clienteId={form.cliente_id}
                clienteNombre={form.cliente}
                readOnly={effectiveLock}
                valorReferencia={parseDecimalCO(form.valor_final_aprobado)}
                onClienteMismatchChange={setFacturasClienteMismatch}
                onTotalFacturadoChange={setTotalFacturado}
              />
            </FormField>
          </FormSection>
          )}

            </div>
            )}

            {activeTab === 'seguimiento' && (
              <FormSection
                title="Bitácora de seguimiento"
                description={
                  effectiveLock
                    ? 'Historial de notas con fecha y autor.'
                    : 'Cada nota queda con fecha y autor. Agregue seguimientos cuando avance la cotización.'
                }
              >
                <SeguimientoMiceChat
                  solicitudId={solicitudId}
                  currentUserId={user?.id ?? ''}
                  autorNombre={currentUserName || user?.email || 'Usuario'}
                  pendingMessage={pendingSeguimiento}
                  onPendingMessageChange={setPendingSeguimiento}
                  readOnly={effectiveLock || formBusy}
                />
              </FormSection>
            )}

            {activeTab === 'historial' && (
              <FormSection
                title="Historial de cambios"
                description="Registro automático al guardar ediciones: campo anterior y valor nuevo."
              >
                {solicitudId ? (
                  <AuditoriaPanel modulo="solicitudes-mice" idRegistro={solicitudId} />
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    El historial estará disponible después de registrar la solicitud.
                  </p>
                )}
              </FormSection>
            )}

            {!effectiveLock && activeTab === 'cotizacion' && (
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 sm:px-7 py-5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={formBusy}>
                  Cancelar
                </Button>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    variant="secondary"
                    loading={isSaving}
                    disabled={catalogLoading || formBusy || formHydrating}
                    size="lg"
                  >
                    {isEdit ? 'Guardar cambios' : 'Registrar solicitud MICE'}
                  </Button>
                  {isEdit && solicitudId && puedeAvanzar(etapaActual) && (() => {
                    const siguiente = siguienteEtapa(etapaActual!)
                    if (!siguiente) return null
                    const avanzarBloqueado = catalogLoading || formBusy || formHydrating || !puedeAvanzarAhora
                    return (
                      <Button
                        type="button"
                        loading={isSaving}
                        disabled={avanzarBloqueado}
                        size="lg"
                        onClick={handleAvanzarEtapa}
                        title={!puedeAvanzarAhora ? 'Complete los campos requeridos para avanzar' : undefined}
                      >
                        Avanzar a "{labelEtapa(siguiente)}"
                      </Button>
                    )
                  })()}
                </div>
              </div>
            )}
          </Card>
        </form>

        <SaveFeedbackOverlay
          feedback={saveFeedback}
          onDismiss={
            saveFeedback?.status === 'error'
              ? () => {
                  setSaveFeedback(null)
                  setSubmitError(null)
                }
              : undefined
          }
        />
      </div>
  )
}
