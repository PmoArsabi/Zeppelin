import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { fetchClientesZeppelinCatalog, clientesToIdOptions, buildClienteNombreById } from '@/lib/clientes'
import { parseDecimalCO } from '@/lib/decimalFormat'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import FormField from '@/components/ui/FormField'
import PageTitle from '@/components/ui/PageTitle'
import Input from '@/components/ui/Input'
import DecimalInput from '@/components/ui/DecimalInput'
import YearInput from '@/components/ui/YearInput'
import CustomSelect from '@/components/ui/CustomSelect'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import SaveFeedbackOverlay, { type SaveFeedbackState } from '@/components/ui/SaveFeedbackOverlay'
import type { NavigateFn } from '@/modules'
import {
  INITIAL_FORM_MICE,
  type SolicitudMiceForm,
  type SolicitudMiceEdit,
  type MonedaCotizacion,
} from '../types'
import type { MiceCatalogos } from '../types/mice-catalogos'
import { MICE_CATALOGOS_VACIOS } from '../types/mice-catalogos'
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
import LugarMiceSelect from '../components/LugarMiceSelect'
import ServiciosMiceSelect from '../components/ServiciosMiceSelect'
import SeguimientoMiceChat from '../components/SeguimientoMiceChat'
import AuditoriaPanel from '@/components/auditoria/AuditoriaPanel'

function cloneFormMice(f: SolicitudMiceForm): SolicitudMiceForm {
  return JSON.parse(JSON.stringify(f)) as SolicitudMiceForm
}

type Errors = Partial<Record<keyof SolicitudMiceForm, string>>

function validate(form: SolicitudMiceForm, catalog: MiceCatalogos, requireCotizacion: boolean): Errors {
  const e: Errors = {}
  if (!catalog.anios.includes(form.anio)) {
    e.anio = 'Seleccione un año válido.'
  }
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
  if (requireCotizacion) {
    if (!form.valor_cotizado.trim()) {
      e.valor_cotizado = 'Ingrese el valor cotizado.'
    } else if (parseDecimalCO(form.valor_cotizado) == null) {
      e.valor_cotizado = 'Valor cotizado inválido.'
    }
    if (!form.utilidad_proyectada.trim()) {
      e.utilidad_proyectada = 'Ingrese la utilidad proyectada.'
    } else if (parseDecimalCO(form.utilidad_proyectada) == null) {
      e.utilidad_proyectada = 'Utilidad proyectada inválida.'
    }
    if (!form.fecha_entrega) {
      e.fecha_entrega = 'La fecha de entrega es obligatoria.'
    } else if (form.fecha_solicitud && form.fecha_entrega < form.fecha_solicitud) {
      e.fecha_entrega = 'Debe ser igual o posterior a la fecha de solicitud.'
    }
    if (form.probabilidad_id == null && !form.probabilidad.trim()) {
      e.probabilidad = 'Seleccione una probabilidad.'
    } else if (
      form.probabilidad_id != null &&
      !catalog.probabilidades.some(p => p.id === form.probabilidad_id)
    ) {
      e.probabilidad = 'Seleccione una probabilidad válida.'
    }
  } else {
    if (form.valor_cotizado.trim() && parseDecimalCO(form.valor_cotizado) == null) {
      e.valor_cotizado = 'Valor cotizado inválido.'
    }
    if (form.utilidad_proyectada.trim() && parseDecimalCO(form.utilidad_proyectada) == null) {
      e.utilidad_proyectada = 'Utilidad proyectada inválida.'
    }
    if (form.fecha_entrega && form.fecha_solicitud && form.fecha_entrega < form.fecha_solicitud) {
      e.fecha_entrega = 'Debe ser igual o posterior a la fecha de solicitud.'
    }
    if (
      form.probabilidad_id != null &&
      !catalog.probabilidades.some(p => p.id === form.probabilidad_id)
    ) {
      e.probabilidad = 'Seleccione una probabilidad válida.'
    }
  }
  if (form.pax.trim()) {
    const p = parseInt(form.pax, 10)
    if (!Number.isFinite(p) || p < 0) e.pax = 'PAX debe ser un número válido.'
  }
  const mzp = form.mzp.trim()
  if (!mzp) {
    e.mzp = 'El código MZP es obligatorio.'
  } else if (!/^MZP\d{1,3}$/.test(mzp)) {
    e.mzp = 'Use MZP y hasta 3 dígitos (ej. MZP001).'
  }
  if (form.servicios.length === 0) {
    e.servicios = 'Agregue al menos un servicio.'
  }
  if (form.destinos.length === 0) {
    e.destinos = 'Agregue al menos un destino (país y ciudad).'
  }
  if (!form.tiqueteador_user_id.trim()) {
    e.tiqueteador_user_id = 'Seleccione un tiqueteador.'
  }
  return e
}

type FormTabId = 'cotizacion' | 'seguimiento' | 'historial'

const FORM_TABS: { id: FormTabId; label: string }[] = [
  { id: 'cotizacion', label: 'Cotización' },
  { id: 'seguimiento', label: 'Seguimiento' },
  { id: 'historial', label: 'Historial de cambios' },
]

function FormTabs({
  active,
  onChange,
  disabled = false,
}: {
  active: FormTabId
  onChange: (id: FormTabId) => void
  disabled?: boolean
}) {
  return (
    <div
      className="flex flex-wrap gap-1 px-4 sm:px-6 pt-4 pb-0 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
      role="tablist"
      aria-label="Secciones de la solicitud"
    >
      {FORM_TABS.map(tab => {
        const selected = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(tab.id)}
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
  )
}

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
  onNavigate: NavigateFn
}

export default function SolicitudMiceFormPage({
  editTarget,
  readOnly = false,
  onSaved,
  onCancel,
  onNavigate,
}: Props) {
  const { user } = useAuth()
  const isEdit = editTarget !== null
  const lock = readOnly
  const mzpAuto = !isEdit && !lock
  /** En edición no se modifican cliente, sector ni fecha de solicitud (dato de registro). */
  const lockRegistro = isEdit && !lock

  const [form, setForm] = useState<SolicitudMiceForm>(INITIAL_FORM_MICE)
  const [errors, setErrors] = useState<Errors>({})
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedbackState | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [clientes, setClientes] = useState<{ value: string; label: string }[]>([])
  const [clientesCatalog, setClientesCatalog] = useState<{ id: number; fullname: string }[]>([])
  const [clientesError, setClientesError] = useState<string | null>(null)
  const [sectores, setSectores] = useState<string[]>([])
  const [usuariosTiqueteador, setUsuariosTiqueteador] = useState<{ value: string; label: string }[]>([])
  const [usuariosTiqueteadorError, setUsuariosTiqueteadorError] = useState<string | null>(null)
  const [usuariosTiqueteadorLoaded, setUsuariosTiqueteadorLoaded] = useState(false)
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

  const formBusy = saveFeedback !== null
  const isSaving = saveFeedback?.status === 'saving'
  /** Edición: esperar catálogo + relaciones (servicios, destinos…) sin banner parpadeante */
  const formHydrating = isEdit && (catalogLoading || editLoading)

  useEffect(() => {
    if (saveFeedback?.status !== 'success') return
    const timer = window.setTimeout(() => onSaved(), 2000)
    return () => window.clearTimeout(timer)
  }, [saveFeedback, onSaved])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsuariosTiqueteadorLoaded(false)
     
    setUsuariosResponsableMiceLoaded(false)
    Promise.all([
      fetchClientesZeppelinCatalog(),
      fetchSectoresMice(),
      fetchUsuariosTiqueteador(),
      fetchUsuariosResponsablesMice(),
      fetchMiceCatalogos(),
    ]).then(([clientesRes, sectoresList, usuariosRes, responsablesRes, miceCat]) => {
      if (clientesRes.error) setClientesError(clientesRes.error)
      setClientesCatalog(clientesRes.data)
      setClientes(clientesToIdOptions(clientesRes.data))
      setSectores(sectoresList)
      if (usuariosRes.error) setUsuariosTiqueteadorError(usuariosRes.error)
      setUsuariosTiqueteador(usuariosRes.data)
      setUsuariosTiqueteadorLoaded(true)
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

  useEffect(() => {
    if (!usuariosTiqueteadorLoaded || !form.tiqueteador_user_id) return
    const isAllowed = usuariosTiqueteador.some(u => u.value === form.tiqueteador_user_id)
    if (isAllowed) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(prev => ({
      ...prev,
      tiqueteador_user_id: '',
      tiqueteador_asignado: '',
    }))
  }, [usuariosTiqueteadorLoaded, usuariosTiqueteador, form.tiqueteador_user_id])

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

  const setFechaEntrega = (fecha: string) => {
    set('fecha_entrega', fecha)
    const msg = fechaEntregaError(fecha, form.fecha_solicitud)
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

  const clienteOptions = useMemo(() => {
    const base = clientesToIdOptions(clientesCatalog)
    if (form.cliente_id != null && !base.some(o => o.value === String(form.cliente_id))) {
      return [{ value: String(form.cliente_id), label: form.cliente || 'Cliente anterior' }, ...base]
    }
    return base.length > 0 ? base : clientes
  }, [clientesCatalog, clientes, form.cliente_id, form.cliente])

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
    if (lock || formBusy) return
    setSubmitError(null)
    const v = validate(form, catalog, isEdit)
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
    if (!usuariosTiqueteador.some(u => u.value === form.tiqueteador_user_id)) {
      setErrors({ tiqueteador_user_id: 'Seleccione un tiqueteador de unidad MICE.' })
      setActiveTab('cotizacion')
      return
    }
    if (!user) return
    if (catalog.servicios.length === 0 || catalog.paises.length === 0) {
      setSubmitError('Los catálogos MICE no están disponibles. Verifique las migraciones en Supabase.')
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
    <AppShell activeModule="solicitudes-mice" onNavigate={onNavigate}>
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
            <FormTabs active={activeTab} onChange={setActiveTab} disabled={formBusy} />

            {activeTab === 'cotizacion' && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">

          <FormSection
            step={1}
            title="Información General"
            description="Cliente, responsable, fechas de gestión y datos del evento"
            headerAside={
              <div className="shrink-0 pl-4 border-l border-slate-200 dark:border-slate-700 text-right">
                <p
                  className={`font-mono text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 ${
                    mzpLoading && mzpAuto ? 'opacity-50' : ''
                  }`}
                  aria-label="Código MZP"
                  aria-live="polite"
                >
                  {mzpLoading && mzpAuto ? '…' : form.mzp || '—'}
                </p>
                {errors.mzp && (
                  <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-1">{errors.mzp}</p>
                )}
              </div>
            }
          >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <FormField label="Cliente" required htmlFor="cliente_id" error={errors.cliente_id}
                  className="sm:col-span-2 lg:col-span-2 min-w-0">
                  <CustomSelect
                    id="cliente_id"
                    value={form.cliente_id != null ? String(form.cliente_id) : ''}
                    onChange={v => {
                      const id = v ? Number(v) : null
                      const item = clientesCatalog.find(c => c.id === id)
                      setForm(prev => ({
                        ...prev,
                        cliente_id: id,
                        cliente: item?.fullname ?? prev.cliente,
                      }))
                    }}
                    placeholder={catalogLoading ? 'Cargando...' : 'Seleccionar cliente...'}
                    error={!!errors.cliente_id}
                    disabled={lock || lockRegistro || catalogLoading || !!clientesError}
                    searchable
                    options={clienteOptions}
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
                    disabled={lock || lockRegistro}
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
                    disabled={lock || catalogLoading}
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
                    disabled={lock || !!usuariosResponsableMiceError}
                  />
                </FormField>
                <FormField label="Nombre (evento / grupo)" required htmlFor="nombre" error={errors.nombre}
                  className="sm:col-span-2 lg:col-span-3 min-w-0">
                  <Input id="nombre" type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)}
                    placeholder="Nombre del evento MICE" error={!!errors.nombre} disabled={lock} />
                </FormField>
                <FormField label="Fecha solicitud" required htmlFor="fecha_solicitud" error={errors.fecha_solicitud}
                  className="lg:col-span-1 min-w-0">
                  <Input id="fecha_solicitud" type="date" value={form.fecha_solicitud}
                    onChange={e => setFechaSolicitud(e.target.value)} error={!!errors.fecha_solicitud}
                    disabled={lock || lockRegistro}
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
                    disabled={lock || catalogLoading}
                  />
                </FormField>
                <FormField label="Fecha inicio" htmlFor="inicio" optional error={errors.inicio}
                  className="lg:col-span-1 min-w-0">
                  <Input
                    id="inicio"
                    type="date"
                    value={form.inicio}
                    onChange={e => setInicio(e.target.value)}
                    error={!!errors.inicio}
                    disabled={lock}
                    className="scheme-light dark:scheme-dark"
                  />
                </FormField>
                <FormField
                  label="Fecha fin"
                  htmlFor="fin"
                  optional
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
                    disabled={lock}
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
                    readOnly={lock}
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
                      onChange={e => set('pax', e.target.value)} error={!!errors.pax} disabled={lock} />
                  </FormField>
                  <FormField label="Lugar" optional className="w-full sm:w-auto shrink-0 min-w-0">
                    <LugarMiceSelect
                      lugares={catalog.lugares}
                      value={form.lugares}
                      onChange={lugares => set('lugares', lugares)}
                      error={!!errors.lugares}
                      readOnly={lock}
                    />
                  </FormField>
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
                      disabled={lock || catalogLoading || !!usuariosTiqueteadorError}
                    />
                  </FormField>
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
                      readOnly={lock}
                    />
                  </FormField>
                </div>
              </div>
          </FormSection>

          <FormSection
            step={3}
            title="Cotización"
            description={
              isEdit
                ? 'Valor, utilidad, entrega y probabilidad'
                : 'Valor, utilidad, entrega y probabilidad (opcional al registrar)'
            }
          >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 items-end">
                <FormField
                  label="Valor cotizado"
                  htmlFor="valor_cotizado"
                  required={isEdit}
                  optional={!isEdit}
                  error={errors.valor_cotizado}
                  className="sm:col-span-1 lg:col-span-4 min-w-0"
                >
                  <div className="flex gap-2 min-w-0">
                    <Select
                      id="moneda_cotizacion"
                      value={form.moneda_cotizacion}
                      onChange={e => set('moneda_cotizacion', e.target.value as MonedaCotizacion)}
                      disabled={lock}
                      className="w-24 shrink-0"
                      aria-label="Moneda de cotización"
                    >
                      {catalog.monedas.map(m => (
                        <option key={m.codigo} value={m.codigo}>{m.codigo}</option>
                      ))}
                    </Select>
                    <DecimalInput
                      id="valor_cotizado"
                      value={form.valor_cotizado}
                      onChange={v => set('valor_cotizado', v)}
                      placeholder="0"
                      className="min-w-0 flex-1"
                      error={!!errors.valor_cotizado}
                      disabled={lock}
                    />
                  </div>
                </FormField>
                <FormField
                  label="Utilidad proyectada"
                  htmlFor="utilidad"
                  required={isEdit}
                  optional={!isEdit}
                  error={errors.utilidad_proyectada}
                  className="sm:col-span-1 lg:col-span-4 min-w-0"
                >
                  <DecimalInput
                    id="utilidad"
                    value={form.utilidad_proyectada}
                    onChange={v => set('utilidad_proyectada', v)}
                    placeholder="0"
                    error={!!errors.utilidad_proyectada}
                    disabled={lock}
                  />
                </FormField>
                <FormField
                  label="Fecha entrega"
                  htmlFor="fecha_entrega"
                  required={isEdit}
                  optional={!isEdit}
                  error={errors.fecha_entrega}
                  className="sm:col-span-1 lg:col-span-2 lg:max-w-44 min-w-0"
                >
                  <Input
                    id="fecha_entrega"
                    type="date"
                    value={form.fecha_entrega}
                    min={form.fecha_solicitud || undefined}
                    onChange={e => setFechaEntrega(e.target.value)}
                    error={!!errors.fecha_entrega}
                    disabled={lock}
                    className="scheme-light dark:scheme-dark"
                  />
                </FormField>
                <FormField
                  label="Probabilidad"
                  htmlFor="probabilidad"
                  required={isEdit}
                  optional={!isEdit}
                  error={errors.probabilidad}
                  className="sm:col-span-1 lg:col-span-2 lg:max-w-40 min-w-0"
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
                    disabled={lock || catalogLoading}
                  />
                </FormField>
              </div>
          </FormSection>

            </div>
            )}

            {activeTab === 'seguimiento' && (
              <FormSection
                title="Bitácora de seguimiento"
                description={
                  lock
                    ? 'Historial de notas con fecha y autor.'
                    : 'Cada nota queda con fecha y autor. Agregue seguimientos cuando avance la cotización.'
                }
              >
                <SeguimientoMiceChat
                  solicitudId={solicitudId}
                  currentUserId={user?.id ?? ''}
                  autorNombre={form.responsable_nombre.trim() || user?.email || 'Usuario'}
                  pendingMessage={pendingSeguimiento}
                  onPendingMessageChange={setPendingSeguimiento}
                readOnly={lock || formBusy}
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

            {!lock && activeTab === 'cotizacion' && (
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 px-5 sm:px-7 py-5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={formBusy}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  loading={isSaving}
                  disabled={catalogLoading || formBusy || formHydrating}
                  size="lg"
                >
                  {isEdit ? 'Guardar cambios' : 'Registrar solicitud MICE'}
                </Button>
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
    </AppShell>
  )
}
