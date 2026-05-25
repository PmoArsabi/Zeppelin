import { useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { fetchClientesZeppelin } from '@/lib/clientes'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/layout/AppShell'
import { Card } from '../components/ui/Card'
import FormField from '../components/ui/FormField'
import Input from '../components/ui/Input'
import CustomSelect from '../components/ui/CustomSelect'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import Alert from '../components/ui/Alert'
import YesNoToggle from '../components/YesNoToggle'
import SaveFeedbackOverlay, { type SaveFeedbackState } from '@/components/ui/SaveFeedbackOverlay'
import {
  ESTADOS,
  TIPOS,
  MODALIDADES,
  INITIAL_FORM,
  type SolicitudForm,
  type SolicitudEdit,
} from '@/modules/solicitudes-corporativos/types'
import { buildAuditoriaCorpObservacion } from '@/lib/auditoria/camposCorp'
import { registrarAuditoriaEdicion } from '@/lib/auditoria/logAuditoriaService'
import AuditoriaPanel from '@/components/auditoria/AuditoriaPanel'
import SeguimientoCorpChat from '@/modules/solicitudes-corporativos/components/SeguimientoCorpChat'
import { addSeguimientoCorp } from '@/modules/solicitudes-corporativos/services/seguimientoCorpService'
import type { NavigateFn } from '@/modules/types'

function cloneFormCorp(f: SolicitudForm): SolicitudForm {
  return JSON.parse(JSON.stringify(f)) as SolicitudForm
}

type Errors = Partial<Record<keyof SolicitudForm, string>>

type FormTabId = 'solicitud' | 'seguimiento' | 'historial'

const FORM_TABS: { id: FormTabId; label: string }[] = [
  { id: 'solicitud', label: 'Solicitud' },
  { id: 'seguimiento', label: 'Seguimiento' },
  { id: 'historial', label: 'Historial de cambios' },
]

const SERVICIOS: { key: keyof SolicitudForm; label: string; hint: string }[] = [
  { key: 'tiquetes', label: 'Tiquetes', hint: '¿Incluye vuelos o trenes?' },
  { key: 'hoteles', label: 'Hoteles', hint: '¿Incluye alojamiento?' },
  { key: 'transportes', label: 'Transportes', hint: '¿Incluye traslados?' },
  { key: 'asistencia', label: 'Asistencia', hint: '¿Incluye asistencia en viaje?' },
  { key: 'otros', label: 'Otros', hint: '¿Algún servicio adicional?' },
]

function validate(form: SolicitudForm): Errors {
  const e: Errors = {}
  if (!form.fecha) e.fecha = 'La fecha es obligatoria.'
  if (!form.localizador) {
    e.localizador = 'El localizador es obligatorio.'
  } else if (!/^[A-Za-z0-9]{3,}$/.test(form.localizador)) {
    e.localizador = 'Solo letras y números, mínimo 3 caracteres, sin espacios.'
  }
  if (!form.cliente) e.cliente = 'Debe seleccionar un cliente válido.'
  if (form.tiquetes === null) e.tiquetes = 'Requerido.'
  if (form.hoteles === null) e.hoteles = 'Requerido.'
  if (form.transportes === null) e.transportes = 'Requerido.'
  if (form.asistencia === null) e.asistencia = 'Requerido.'
  if (form.otros === null) e.otros = 'Requerido.'
  if (form.otros === true && !form.detalle_otros.trim())
    e.detalle_otros = 'Debe describir el detalle de "Otros".'
  if (form.detalle_otros.length > 100) e.detalle_otros = 'Máximo 100 caracteres.'
  if (!form.estado) e.estado = 'Debe seleccionar un estado.'
  if (!form.tipo) e.tipo = 'Debe seleccionar un tipo de solicitud.'
  if (!form.modalidad) e.modalidad = 'Debe seleccionar una modalidad.'
  return e
}

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
          <PageTitle as="h3" size="section">{title}</PageTitle>
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
  editTarget: SolicitudEdit | null
  readOnly?: boolean
  onSaved: () => void
  onCancel: () => void
  onNavigate: NavigateFn
}

export default function SolicitudPage({
  editTarget,
  readOnly = false,
  onSaved,
  onCancel,
  onNavigate,
}: Props) {
  const { user } = useAuth()
  const isEdit = editTarget !== null
  const lock = readOnly

  const [form, setForm] = useState<SolicitudForm>(INITIAL_FORM)
  const [errors, setErrors] = useState<Errors>({})
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedbackState | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [clientes, setClientes] = useState<{ value: string; label: string }[]>([])
  const [clientesLoading, setClientesLoading] = useState(true)
  const [clientesError, setClientesError] = useState<string | null>(null)
  const [formBaseline, setFormBaseline] = useState<SolicitudForm | null>(null)
  const [auditWarning, setAuditWarning] = useState<string | null>(null)
  const [pendingSeguimiento, setPendingSeguimiento] = useState('')
  const [solicitudId, setSolicitudId] = useState<string | null>(editTarget?.id ?? null)
  const [activeTab, setActiveTab] = useState<FormTabId>('solicitud')

  const formBusy = saveFeedback !== null
  const isSaving = saveFeedback?.status === 'saving'
  const fieldDisabled = lock || formBusy

  useEffect(() => {
    if (saveFeedback?.status !== 'success') return
    const timer = window.setTimeout(() => onSaved(), 2000)
    return () => window.clearTimeout(timer)
  }, [saveFeedback, onSaved])

  useEffect(() => {
    fetchClientesZeppelin().then(({ data, error }) => {
      if (error) setClientesError(error)
      setClientes(data)
      setClientesLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('td_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) {
          setForm(prev => ({ ...prev, asesor: data.display_name }))
        }
      })
  }, [user])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSolicitudId(editTarget?.id ?? null)
    setPendingSeguimiento('')
    setActiveTab('solicitud')
    if (editTarget) {
      const loaded: SolicitudForm = {
        fecha: editTarget.fecha,
        localizador: editTarget.localizador,
        cliente: editTarget.cliente,
        asesor: editTarget.asesor,
        tiquetes: editTarget.tiquetes,
        hoteles: editTarget.hoteles,
        transportes: editTarget.transportes,
        asistencia: editTarget.asistencia,
        otros: editTarget.otros,
        detalle_otros: editTarget.detalle_otros ?? '',
        estado: editTarget.estado as SolicitudForm['estado'],
        tipo: editTarget.tipo as SolicitudForm['tipo'],
        modalidad: editTarget.modalidad as SolicitudForm['modalidad'],
      }
      setForm(loaded)
      setFormBaseline(cloneFormCorp(loaded))
    } else {
      setFormBaseline(null)
      setForm(prev => ({ ...INITIAL_FORM, asesor: prev.asesor }))
    }
    setErrors({})
    setSubmitError(null)
  }, [editTarget])
  /* eslint-enable react-hooks/set-state-in-effect */

  const set = <K extends keyof SolicitudForm>(key: K, value: SolicitudForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lock || formBusy) return
    setSubmitError(null)
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setActiveTab('solicitud')
      return
    }
    if (!user) return

    setSaveFeedback({
      status: 'saving',
      title: isEdit ? 'Guardando cambios...' : 'Registrando solicitud...',
    })

    const payload = {
      fecha: form.fecha,
      localizador: form.localizador.toUpperCase(),
      cliente: form.cliente,
      asesor: form.asesor,
      tiquetes: form.tiquetes,
      hoteles: form.hoteles,
      transportes: form.transportes,
      asistencia: form.asistencia,
      otros: form.otros,
      detalle_otros: form.otros ? form.detalle_otros.trim() : null,
      estado: form.estado,
      tipo: form.tipo,
      modalidad: form.modalidad,
    }

    try {
      if (isEdit) {
        const { error } = await supabase.from('th_solicitud_corporativos').update(payload).eq('id', editTarget!.id)
        if (error) throw error
        if (formBaseline) {
          const observacion = buildAuditoriaCorpObservacion(formBaseline, form)
          const audit = await registrarAuditoriaEdicion(
            'solicitudes-corporativos',
            editTarget!.id,
            user.id,
            form.asesor.trim() || user.email || 'Usuario',
            observacion
          )
          if (audit.warning) setAuditWarning(audit.warning)
        }
        setSaveFeedback({
          status: 'success',
          title: 'Cambios guardados correctamente',
        })
      } else {
        const { data, error } = await supabase
          .from('th_solicitud_corporativos')
          .insert({ ...payload, user_id: user.id })
          .select('id')
          .single()
        if (error) throw error
        if (!data?.id) throw new Error('No se obtuvo el id de la solicitud creada.')
        const newId = data.id as string
        setSolicitudId(newId)
        const segText = pendingSeguimiento.trim()
        if (segText) {
          const seg = await addSeguimientoCorp(newId, user.id, form.asesor.trim() || user.email || 'Usuario', segText)
          if (seg.error) throw new Error(seg.error)
        }
        setSaveFeedback({
          status: 'success',
          title: 'Solicitud registrada correctamente',
        })
      }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : 'Error al guardar la solicitud.'
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
      {lock ? 'Volver al listado' : 'Mis solicitudes'}
    </button>
  )

  return (
    <AppShell activeModule="solicitudes-corporativos" onNavigate={onNavigate}>
      <div className="w-full min-w-0 px-4 sm:px-5 lg:px-6 py-8 sm:py-10">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {nav}
          {lock && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              Solo lectura
            </span>
          )}
        </div>

        {!lock && (
          <div className="mb-6">
            <PageTitle>
              {isEdit ? 'Editar solicitud' : 'Nueva solicitud operativa'}
            </PageTitle>
          </div>
        )}

        {submitError && saveFeedback?.status !== 'error' && (
          <Alert variant="error" className="mb-6">{submitError}</Alert>
        )}
        {auditWarning && <Alert variant="info" className="mb-6">{auditWarning}</Alert>}
        {clientesError && <Alert variant="error" className="mb-6">{clientesError}</Alert>}

        <form onSubmit={handleSubmit} noValidate>
          <Card
            className={`overflow-hidden ${formBusy ? 'pointer-events-none select-none opacity-70' : ''}`}
            aria-busy={formBusy}
          >
            <FormTabs active={activeTab} onChange={setActiveTab} disabled={formBusy} />

            {activeTab === 'solicitud' && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <FormSection
                  step={1}
                  title="Información básica"
                  description="Datos de identificación de la solicitud"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <FormField label="Fecha" required htmlFor="fecha" error={errors.fecha}>
                      <Input
                        id="fecha"
                        type="date"
                        value={form.fecha}
                        onChange={e => set('fecha', e.target.value)}
                        error={!!errors.fecha}
                        disabled={fieldDisabled}
                        className="scheme-light dark:scheme-dark"
                      />
                    </FormField>
                    <FormField
                      label="Localizador"
                      required
                      htmlFor="localizador"
                      error={errors.localizador}
                      hint="Alfanumérico, sin espacios."
                    >
                      <Input
                        id="localizador"
                        type="text"
                        value={form.localizador}
                        onChange={e => set('localizador', e.target.value.replace(/\s/g, '').toUpperCase())}
                        placeholder="Ej. ABC123"
                        error={!!errors.localizador}
                        disabled={fieldDisabled}
                      />
                    </FormField>
                    <FormField
                      label="Cliente"
                      required
                      htmlFor="cliente"
                      error={errors.cliente}
                      className="sm:col-span-2 lg:col-span-2"
                    >
                      <CustomSelect
                        id="cliente"
                        value={form.cliente}
                        onChange={v => set('cliente', v)}
                        placeholder={clientesLoading ? 'Cargando clientes...' : 'Seleccionar cliente...'}
                        error={!!errors.cliente}
                        disabled={fieldDisabled || clientesLoading || !!clientesError}
                        searchable
                        options={clientes}
                      />
                    </FormField>
                    <FormField label="Asesor" htmlFor="asesor" className="sm:col-span-2 lg:col-span-2">
                      <Input
                        id="asesor"
                        type="text"
                        value={form.asesor}
                        readOnly
                        className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 cursor-default"
                        placeholder="Cargando..."
                      />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection
                  step={2}
                  title="Servicios solicitados"
                  description="Indique qué servicios incluye esta solicitud"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {SERVICIOS.map(({ key, label, hint }) => (
                      <FormField key={key} label={label} required error={errors[key]} hint={!errors[key] ? hint : undefined}>
                        <YesNoToggle
                          value={form[key] as boolean | null}
                          onChange={v => set(key, v)}
                          error={!!errors[key]}
                          disabled={fieldDisabled}
                        />
                      </FormField>
                    ))}
                  </div>
                  {form.otros === true && (
                    <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                      <FormField
                        label="Detalle de Otros"
                        required
                        htmlFor="detalle_otros"
                        error={errors.detalle_otros}
                        counter={{ current: form.detalle_otros.length, max: 100 }}
                      >
                        <Input
                          id="detalle_otros"
                          type="text"
                          value={form.detalle_otros}
                          onChange={e => set('detalle_otros', e.target.value)}
                          placeholder="Describa brevemente el servicio adicional"
                          maxLength={100}
                          error={!!errors.detalle_otros}
                          disabled={fieldDisabled}
                        />
                      </FormField>
                    </div>
                  )}
                </FormSection>

                <FormSection
                  step={3}
                  title="Clasificación"
                  description="Estado, tipo y modalidad de la solicitud"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <FormField label="Estado" required htmlFor="estado" error={errors.estado}>
                      <CustomSelect
                        id="estado"
                        value={form.estado}
                        onChange={v => set('estado', v as SolicitudForm['estado'])}
                        placeholder="Seleccionar..."
                        error={!!errors.estado}
                        disabled={fieldDisabled}
                        options={ESTADOS.map(s => ({ value: s, label: s }))}
                      />
                    </FormField>
                    <FormField label="Tipo de solicitud" required htmlFor="tipo" error={errors.tipo}>
                      <CustomSelect
                        id="tipo"
                        value={form.tipo}
                        onChange={v => set('tipo', v as SolicitudForm['tipo'])}
                        placeholder="Seleccionar..."
                        error={!!errors.tipo}
                        disabled={fieldDisabled}
                        options={TIPOS.map(t => ({ value: t, label: t }))}
                      />
                    </FormField>
                    <FormField label="Modalidad" required htmlFor="modalidad" error={errors.modalidad}>
                      <CustomSelect
                        id="modalidad"
                        value={form.modalidad}
                        onChange={v => set('modalidad', v as SolicitudForm['modalidad'])}
                        placeholder="Seleccionar..."
                        error={!!errors.modalidad}
                        disabled={fieldDisabled}
                        options={MODALIDADES.map(m => ({ value: m, label: m }))}
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
                    : 'Cada nota queda con fecha y autor. Agregue seguimientos cuando avance la solicitud.'
                }
              >
                <SeguimientoCorpChat
                  solicitudId={solicitudId}
                  currentUserId={user?.id ?? ''}
                  autorNombre={form.asesor.trim() || user?.email || 'Usuario'}
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
                  <AuditoriaPanel modulo="solicitudes-corporativos" idRegistro={solicitudId} />
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    El historial estará disponible después de registrar la solicitud.
                  </p>
                )}
              </FormSection>
            )}

            {!lock && activeTab === 'solicitud' && (
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 px-5 sm:px-7 py-5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={formBusy}>
                  Cancelar
                </Button>
                <Button type="submit" loading={isSaving} disabled={formBusy || clientesLoading} size="lg">
                  {isEdit ? 'Guardar cambios' : 'Registrar solicitud'}
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
