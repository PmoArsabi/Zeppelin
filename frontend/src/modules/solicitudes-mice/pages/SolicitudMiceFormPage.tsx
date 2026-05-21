import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchClientesZeppelin } from '@/lib/clientes'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import DecimalInput from '@/components/ui/DecimalInput'
import YearInput from '@/components/ui/YearInput'
import MzpInput from '@/components/ui/MzpInput'
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
} from '../services/solicitudesMiceService'
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

function validate(form: SolicitudMiceForm, catalog: MiceCatalogos): Errors {
  const e: Errors = {}
  if (!catalog.anios.includes(form.anio)) {
    e.anio = 'Seleccione un año válido.'
  }
  if (!form.cliente.trim()) e.cliente = 'Seleccione un cliente.'
  if (!form.nombre.trim()) e.nombre = 'El nombre del evento es obligatorio.'
  if (!form.estado) e.estado = 'Seleccione un estado.'
  if (!form.fecha_solicitud) e.fecha_solicitud = 'La fecha de solicitud es obligatoria.'
  if (form.inicio && form.fin && form.fin < form.inicio) {
    e.fin = 'Debe ser igual o posterior a la fecha de inicio.'
  }
  if (form.fecha_entrega && form.fecha_solicitud && form.fecha_entrega < form.fecha_solicitud) {
    e.fecha_entrega = 'Debe ser igual o posterior a la fecha de solicitud.'
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
  children,
}: {
  step?: number
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="px-5 sm:px-7 py-6">
      <div className="flex items-center gap-3 mb-5">
        {step != null && (
          <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center ring-1 ring-indigo-200 dark:ring-indigo-500/30">
            {step}
          </span>
        )}
        <div>
          <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">{title}</h3>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
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

  const [form, setForm] = useState<SolicitudMiceForm>(INITIAL_FORM_MICE)
  const [errors, setErrors] = useState<Errors>({})
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedbackState | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [clientes, setClientes] = useState<{ value: string; label: string }[]>([])
  const [clientesError, setClientesError] = useState<string | null>(null)
  const [sectores, setSectores] = useState<string[]>([])
  const [usuariosTiqueteador, setUsuariosTiqueteador] = useState<{ value: string; label: string }[]>([])
  const [usuariosTiqueteadorError, setUsuariosTiqueteadorError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<MiceCatalogos>(MICE_CATALOGOS_VACIOS)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogWarning, setCatalogWarning] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [pendingSeguimiento, setPendingSeguimiento] = useState('')
  const [solicitudId, setSolicitudId] = useState<string | null>(editTarget?.id ?? null)
  const [formBaseline, setFormBaseline] = useState<SolicitudMiceForm | null>(null)
  const [activeTab, setActiveTab] = useState<FormTabId>('cotizacion')

  const formBusy = saveFeedback !== null
  const isSaving = saveFeedback?.status === 'saving'

  useEffect(() => {
    if (saveFeedback?.status !== 'success') return
    const timer = window.setTimeout(() => onSaved(), 2000)
    return () => window.clearTimeout(timer)
  }, [saveFeedback, onSaved])

  useEffect(() => {
    Promise.all([
      fetchClientesZeppelin(),
      fetchSectoresMice(),
      fetchUsuariosTiqueteador(),
      fetchMiceCatalogos(),
    ]).then(([clientesRes, sectoresList, usuariosRes, miceCat]) => {
      if (clientesRes.error) setClientesError(clientesRes.error)
      setClientes(clientesRes.data)
      setSectores(sectoresList)
      if (usuariosRes.error) setUsuariosTiqueteadorError(usuariosRes.error)
      setUsuariosTiqueteador(usuariosRes.data)
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
    if (!user) return
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) {
          setForm(prev => ({ ...prev, responsable_nombre: data.display_name }))
        }
      })
  }, [user])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSolicitudId(editTarget?.id ?? null)
    setPendingSeguimiento('')
    setFormBaseline(null)
    setActiveTab('cotizacion')
  }, [editTarget])

  useEffect(() => {
    if (!editTarget || catalogLoading) return
    setEditLoading(true)
    loadSolicitudForEdit(editTarget, catalog).then(({ form: loaded, error }) => {
      setForm(loaded)
      setFormBaseline(cloneFormMice(loaded))
      if (error) setCatalogWarning(prev => prev ? `${prev} ${error}` : error)
      setEditLoading(false)
    })
  }, [editTarget, catalog, catalogLoading])
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const tiqueteadorOptions = useMemo(() => {
    const base = [{ value: '', label: 'No aplica' }, ...usuariosTiqueteador]
    const id = form.tiqueteador_user_id
    if (id && !usuariosTiqueteador.some(u => u.value === id)) {
      const label = form.tiqueteador_asignado.trim() || 'Usuario anterior'
      return [...base, { value: id, label }]
    }
    return base
  }, [usuariosTiqueteador, form.tiqueteador_user_id, form.tiqueteador_asignado])

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
    const v = validate(form, catalog)
    if (Object.keys(v).length > 0) {
      setErrors(v)
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
          ? 'La tabla solicitudes_mice no existe aún. Ejecuta la migración SQL en Supabase (ver database/migrations/).'
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
        {editLoading && <Alert variant="info" className="mb-6">Cargando datos de la cotización...</Alert>}

        <form onSubmit={handleSubmit} noValidate>
          <Card
            className={`overflow-hidden ${formBusy ? 'pointer-events-none select-none opacity-70' : ''}`}
            aria-busy={formBusy}
          >
            <FormTabs active={activeTab} onChange={setActiveTab} disabled={formBusy} />

            {activeTab === 'cotizacion' && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">

          <FormSection step={1} title="Datos del cliente" description="Cliente, año, sector y fechas de gestión">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <FormField label="Cliente" required htmlFor="cliente" error={errors.cliente}
                  className="sm:col-span-2 lg:col-span-2">
                  <CustomSelect id="cliente" value={form.cliente} onChange={v => set('cliente', v)}
                    placeholder={catalogLoading ? 'Cargando...' : 'Seleccionar cliente...'}
                    error={!!errors.cliente} disabled={lock || catalogLoading || !!clientesError} searchable
                    options={clientes} />
                </FormField>
                <FormField label="Sector" htmlFor="sector" optional className="sm:col-span-2 lg:col-span-2">
                  <CustomSelect id="sector" value={form.sector} onChange={v => set('sector', v)}
                    placeholder="Seleccionar sector..."
                    options={[{ value: '', label: '—' }, ...sectores.map(s => ({ value: s, label: s }))]}
                    disabled={lock} />
                </FormField>
                <FormField label="Año" required htmlFor="anio" error={errors.anio}>
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
                <FormField label="MZP" htmlFor="mzp" required error={errors.mzp} hint="Prefijo MZP + hasta 3 dígitos">
                  <MzpInput
                    id="mzp"
                    value={form.mzp}
                    onChange={v => set('mzp', v)}
                    error={!!errors.mzp}
                    disabled={lock}
                  />
                </FormField>
                <FormField label="Fecha solicitud" required htmlFor="fecha_solicitud" error={errors.fecha_solicitud}>
                  <Input id="fecha_solicitud" type="date" value={form.fecha_solicitud}
                    onChange={e => setFechaSolicitud(e.target.value)} error={!!errors.fecha_solicitud}
                    disabled={lock}
                    className="scheme-light dark:scheme-dark" />
                </FormField>
                <FormField
                  label="Fecha entrega"
                  htmlFor="fecha_entrega"
                  optional
                  error={errors.fecha_entrega}
                  hint={form.fecha_solicitud ? `Mínimo: ${form.fecha_solicitud}` : undefined}
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
              </div>
          </FormSection>

          <FormSection step={2} title="Información general del evento" description="Nombre, fechas del evento, estado y cotización">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <FormField label="Nombre (evento / grupo)" required htmlFor="nombre" error={errors.nombre}
                  className="sm:col-span-2 lg:col-span-3">
                  <Input id="nombre" type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)}
                    placeholder="Nombre del evento MICE" error={!!errors.nombre} disabled={lock} />
                </FormField>
                <FormField label="Estado" required htmlFor="estado" error={errors.estado}
                  className="lg:col-span-1">
                  <CustomSelect id="estado" value={form.estado}
                    onChange={v => set('estado', v as SolicitudMiceForm['estado'])}
                    placeholder="Seleccionar estado..." error={!!errors.estado}
                    options={catalog.estados.map(s => ({ value: s.nombre, label: s.nombre }))}
                    disabled={lock || catalogLoading} />
                </FormField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:col-span-2 lg:col-span-3">
                  <FormField label="Fecha inicio" htmlFor="inicio" optional error={errors.inicio}>
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
                <FormField label="Probabilidad" htmlFor="probabilidad" optional className="lg:col-span-1">
                  <CustomSelect id="probabilidad" value={form.probabilidad}
                    onChange={v => set('probabilidad', v as SolicitudMiceForm['probabilidad'])}
                    placeholder="—"
                    options={[
                      { value: '', label: '—' },
                      ...catalog.probabilidades.map(p => ({ value: p.nombre, label: p.nombre })),
                    ]}
                    disabled={lock || catalogLoading} />
                </FormField>
                <FormField label="Valor cotizado" htmlFor="valor_cotizado" optional className="sm:col-span-2 lg:col-span-3 lg:col-start-1"
                  hint="Ej. 1.500.241,01">
                  <div className="flex gap-2">
                    <Select
                      id="moneda_cotizacion"
                      value={form.moneda_cotizacion}
                      onChange={e => set('moneda_cotizacion', e.target.value as MonedaCotizacion)}
                      disabled={lock}
                      className="w-28 shrink-0"
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
                      disabled={lock}
                    />
                  </div>
                </FormField>
                <FormField label="Utilidad proyectada" htmlFor="utilidad" optional className="lg:col-span-1"
                  hint="Ej. 1.500.241,01">
                  <DecimalInput
                    id="utilidad"
                    value={form.utilidad_proyectada}
                    onChange={v => set('utilidad_proyectada', v)}
                    placeholder="0"
                    disabled={lock}
                  />
                </FormField>
              </div>
          </FormSection>

          <FormSection step={3} title="Detalle del evento" description="Servicios, PAX y ubicación">
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
                <FormField label="PAX" htmlFor="pax" optional error={errors.pax}>
                  <Input id="pax" type="number" min={0} value={form.pax}
                    onChange={e => set('pax', e.target.value)} error={!!errors.pax} disabled={lock} />
                </FormField>
                <FormField label="Lugar" optional hint="Puede elegir uno o ambos">
                  <LugarMiceSelect
                    lugares={catalog.lugares}
                    value={form.lugares}
                    onChange={lugares => set('lugares', lugares)}
                    error={!!errors.lugares}
                    readOnly={lock}
                  />
                </FormField>
                <FormField label="Tiqueteador asignado" htmlFor="tiqueteador" optional className="sm:col-span-2 lg:col-span-2"
                  hint="Usuarios registrados en el sistema (tabla profiles)">
                  <CustomSelect
                    id="tiqueteador"
                    value={form.tiqueteador_user_id}
                    onChange={setTiqueteador}
                    placeholder="No aplica"
                    options={tiqueteadorOptions}
                    searchable
                    disabled={lock || catalogLoading}
                  />
                </FormField>
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
                  loading={isSaving || editLoading}
                  disabled={catalogLoading || formBusy}
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
