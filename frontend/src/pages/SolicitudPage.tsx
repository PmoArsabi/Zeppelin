import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/layout/AppShell'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import FormField from '../components/ui/FormField'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import YesNoToggle from '../components/YesNoToggle'
import {
  CLIENTES, ASESORES, ESTADOS, TIPOS, MODALIDADES,
  INITIAL_FORM,
  type SolicitudForm,
} from '../types/solicitud'
import type { SolicitudEdit } from '../App'

type Errors = Partial<Record<keyof SolicitudForm, string>>

const SERVICIOS: { key: keyof SolicitudForm; label: string; hint: string }[] = [
  { key: 'tiquetes',    label: 'Tiquetes',    hint: '¿Incluye vuelos o trenes?' },
  { key: 'hoteles',     label: 'Hoteles',     hint: '¿Incluye alojamiento?' },
  { key: 'transportes', label: 'Transportes', hint: '¿Incluye traslados?' },
  { key: 'asistencia',  label: 'Asistencia',  hint: '¿Incluye asistencia en viaje?' },
  { key: 'otros',       label: 'Otros',       hint: '¿Algún servicio adicional?' },
]

function validate(form: SolicitudForm): Errors {
  const e: Errors = {}
  if (!form.fecha) e.fecha = 'La fecha es obligatoria.'
  if (!form.localizador) {
    e.localizador = 'El localizador es obligatorio.'
  } else if (!/^[A-Za-z0-9]{3,}$/.test(form.localizador)) {
    e.localizador = 'Solo letras y números, mínimo 3 caracteres, sin espacios.'
  }
  if (!form.cliente)    e.cliente    = 'Debe seleccionar un cliente válido.'
  if (!form.asesor)     e.asesor     = 'Debe seleccionar un asesor.'
  if (form.tiquetes    === null) e.tiquetes    = 'Requerido.'
  if (form.hoteles     === null) e.hoteles     = 'Requerido.'
  if (form.transportes === null) e.transportes = 'Requerido.'
  if (form.asistencia  === null) e.asistencia  = 'Requerido.'
  if (form.otros       === null) e.otros       = 'Requerido.'
  if (form.otros === true && !form.detalle_otros.trim())
    e.detalle_otros = 'Debe describir el detalle de "Otros".'
  if (form.detalle_otros.length > 100) e.detalle_otros = 'Máximo 100 caracteres.'
  if (!form.estado)    e.estado    = 'Debe seleccionar un estado.'
  if (!form.tipo)      e.tipo      = 'Debe seleccionar un tipo de solicitud.'
  if (!form.modalidad) e.modalidad = 'Debe seleccionar una modalidad.'
  if (form.observaciones.length > 200) e.observaciones = 'Máximo 200 caracteres.'
  return e
}

interface Props {
  editTarget: SolicitudEdit | null
  onSaved: () => void
  onCancel: () => void
}

export default function SolicitudPage({ editTarget, onSaved, onCancel }: Props) {
  const { user } = useAuth()
  const isEdit = editTarget !== null

  const [form, setForm]           = useState<SolicitudForm>(INITIAL_FORM)
  const [errors, setErrors]       = useState<Errors>({})
  const [loading, setLoading]     = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Poblar el formulario cuando se edita
  useEffect(() => {
    if (editTarget) {
      setForm({
        fecha:         editTarget.fecha,
        localizador:   editTarget.localizador,
        cliente:       editTarget.cliente,
        asesor:        editTarget.asesor,
        ciudad:        editTarget.ciudad ?? '',
        tiquetes:      editTarget.tiquetes,
        hoteles:       editTarget.hoteles,
        transportes:   editTarget.transportes,
        asistencia:    editTarget.asistencia,
        otros:         editTarget.otros,
        detalle_otros: editTarget.detalle_otros ?? '',
        estado:        editTarget.estado as SolicitudForm['estado'],
        tipo:          editTarget.tipo as SolicitudForm['tipo'],
        modalidad:     editTarget.modalidad as SolicitudForm['modalidad'],
        observaciones: editTarget.observaciones ?? '',
      })
    } else {
      setForm(INITIAL_FORM)
    }
    setErrors({})
    setSubmitError(null)
  }, [editTarget])

  const set = <K extends keyof SolicitudForm>(key: K, value: SolicitudForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const handleReset = () => {
    setForm(isEdit && editTarget ? {
      fecha: editTarget.fecha, localizador: editTarget.localizador,
      cliente: editTarget.cliente, asesor: editTarget.asesor,
      ciudad: editTarget.ciudad ?? '', tiquetes: editTarget.tiquetes,
      hoteles: editTarget.hoteles, transportes: editTarget.transportes,
      asistencia: editTarget.asistencia, otros: editTarget.otros,
      detalle_otros: editTarget.detalle_otros ?? '',
      estado: editTarget.estado as SolicitudForm['estado'],
      tipo: editTarget.tipo as SolicitudForm['tipo'],
      modalidad: editTarget.modalidad as SolicitudForm['modalidad'],
      observaciones: editTarget.observaciones ?? '',
    } : INITIAL_FORM)
    setErrors({})
    setSubmitError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      const payload = {
        fecha:         form.fecha,
        localizador:   form.localizador.toUpperCase(),
        cliente:       form.cliente,
        asesor:        form.asesor,
        ciudad:        form.ciudad || null,
        tiquetes:      form.tiquetes,
        hoteles:       form.hoteles,
        transportes:   form.transportes,
        asistencia:    form.asistencia,
        otros:         form.otros,
        detalle_otros: form.otros ? form.detalle_otros.trim() : null,
        estado:        form.estado,
        tipo:          form.tipo,
        modalidad:     form.modalidad,
        observaciones: form.observaciones.trim() || null,
      }

      if (isEdit) {
        const { error } = await supabase.from('solicitudes').update(payload).eq('id', editTarget!.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('solicitudes').insert({ ...payload, user_id: user!.id })
        if (error) throw error
      }
      onSaved()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  const nav = (
    <button
      onClick={onCancel}
      className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400
                 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-1.5
                 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Mis solicitudes
    </button>
  )

  return (
    <AppShell nav={nav}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isEdit ? 'Editar solicitud' : 'Nueva solicitud operativa'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            {isEdit
              ? `Editando localizador ${editTarget!.localizador} — los cambios se guardan al confirmar.`
              : 'Los campos marcados con * son obligatorios.'}
          </p>
        </div>

        {submitError && <Alert variant="error" className="mb-6">{submitError}</Alert>}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* ─── 1. Información básica ─── */}
          <Card>
            <CardHeader step={1} title="Información básica" description="Datos de identificación de la solicitud" />
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="Fecha" required htmlFor="fecha" error={errors.fecha}>
                  <Input id="fecha" type="date" value={form.fecha}
                    onChange={e => set('fecha', e.target.value)} error={!!errors.fecha} />
                </FormField>

                <FormField label="Localizador" required htmlFor="localizador"
                  error={errors.localizador} hint="Alfanumérico, sin espacios.">
                  <Input id="localizador" type="text" value={form.localizador}
                    onChange={e => set('localizador', e.target.value.replace(/\s/g, '').toUpperCase())}
                    placeholder="Ej. ABC123" error={!!errors.localizador} />
                </FormField>

                <FormField label="Cliente" required htmlFor="cliente" error={errors.cliente}>
                  <Select id="cliente" value={form.cliente}
                    onChange={e => set('cliente', e.target.value)} error={!!errors.cliente}>
                    <option value="">Seleccionar cliente...</option>
                    {CLIENTES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </FormField>

                <FormField label="Asesor" required htmlFor="asesor" error={errors.asesor}>
                  <Select id="asesor" value={form.asesor}
                    onChange={e => set('asesor', e.target.value)} error={!!errors.asesor}>
                    <option value="">Seleccionar asesor...</option>
                    {ASESORES.map(a => <option key={a} value={a}>{a}</option>)}
                  </Select>
                </FormField>

                <FormField label="Ciudad" optional htmlFor="ciudad" className="sm:col-span-2">
                  <Input id="ciudad" type="text" value={form.ciudad}
                    onChange={e => set('ciudad', e.target.value.toUpperCase())}
                    placeholder="Ej. BOG, MDE, CTG" maxLength={20} />
                </FormField>
              </div>
            </CardBody>
          </Card>

          {/* ─── 2. Servicios ─── */}
          <Card>
            <CardHeader step={2} title="Servicios solicitados" description="Indique qué servicios incluye esta solicitud" />
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {SERVICIOS.map(({ key, label, hint }) => (
                  <FormField key={key} label={label} required error={errors[key]}
                    hint={!errors[key] ? hint : undefined}>
                    <YesNoToggle
                      value={form[key] as boolean | null}
                      onChange={v => set(key, v)}
                      error={!!errors[key]}
                    />
                  </FormField>
                ))}
              </div>

              {form.otros === true && (
                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-gray-800">
                  <FormField label="Detalle de Otros" required htmlFor="detalle_otros"
                    error={errors.detalle_otros}
                    counter={{ current: form.detalle_otros.length, max: 100 }}>
                    <Input id="detalle_otros" type="text" value={form.detalle_otros}
                      onChange={e => set('detalle_otros', e.target.value)}
                      placeholder="Describa brevemente el servicio adicional"
                      maxLength={100} error={!!errors.detalle_otros} />
                  </FormField>
                </div>
              )}
            </CardBody>
          </Card>

          {/* ─── 3. Clasificación ─── */}
          <Card>
            <CardHeader step={3} title="Clasificación" description="Estado, tipo y modalidad de la solicitud" />
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <FormField label="Estado" required htmlFor="estado" error={errors.estado}>
                  <Select id="estado" value={form.estado}
                    onChange={e => set('estado', e.target.value as SolicitudForm['estado'])}
                    error={!!errors.estado}>
                    <option value="">Seleccionar...</option>
                    {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </FormField>

                <FormField label="Tipo de solicitud" required htmlFor="tipo" error={errors.tipo}>
                  <Select id="tipo" value={form.tipo}
                    onChange={e => set('tipo', e.target.value as SolicitudForm['tipo'])}
                    error={!!errors.tipo}>
                    <option value="">Seleccionar...</option>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </FormField>

                <FormField label="Modalidad" required htmlFor="modalidad" error={errors.modalidad}>
                  <Select id="modalidad" value={form.modalidad}
                    onChange={e => set('modalidad', e.target.value as SolicitudForm['modalidad'])}
                    error={!!errors.modalidad}>
                    <option value="">Seleccionar...</option>
                    {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </FormField>
              </div>
            </CardBody>
          </Card>

          {/* ─── 4. Observaciones ─── */}
          <Card>
            <CardHeader step={4} title="Observaciones" description="Notas adicionales relevantes para esta solicitud" />
            <CardBody>
              <FormField label="Observaciones" optional htmlFor="observaciones"
                error={errors.observaciones}
                counter={{ current: form.observaciones.length, max: 200 }}>
                <textarea
                  id="observaciones"
                  value={form.observaciones}
                  onChange={e => set('observaciones', e.target.value)}
                  placeholder="Información adicional relevante..."
                  rows={4}
                  maxLength={200}
                  className={`
                    w-full px-4 py-3 text-sm rounded-xl border transition-all duration-150 resize-none
                    bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white
                    placeholder-slate-400 dark:placeholder-slate-500
                    focus:outline-none focus:ring-2 focus:ring-offset-0
                    ${errors.observaciones
                      ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-400/30'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/25 focus:border-indigo-400 dark:focus:border-indigo-500'
                    }
                  `}
                />
              </FormField>
            </CardBody>
          </Card>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-2 pb-10">
            <Button type="button" variant="ghost" onClick={handleReset}>
              {isEdit ? 'Restaurar cambios' : 'Limpiar formulario'}
            </Button>
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading} size="lg">
                {isEdit ? 'Guardar cambios' : 'Registrar solicitud'}
              </Button>
            </div>
          </div>

        </form>
      </div>
    </AppShell>
  )
}
