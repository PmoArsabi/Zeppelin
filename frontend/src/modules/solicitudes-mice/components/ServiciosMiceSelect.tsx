import { useMemo, useState } from 'react'
import CustomSelect from '@/components/ui/CustomSelect'
import Button from '@/components/ui/Button'
import { formatServiciosResumen } from '../lib/serviciosMice'
import type { ServicioMiceCatalogo } from '../types/mice-catalogos'

interface Props {
  catalogo: ServicioMiceCatalogo[]
  value: string[]
  onChange: (servicios: string[]) => void
  error?: boolean
  readOnly?: boolean
}

export default function ServiciosMiceSelect({ catalogo, value, onChange, error, readOnly }: Props) {
  const [draftId, setDraftId] = useState('')
  const [draftError, setDraftError] = useState<string | null>(null)

  const disponibles = useMemo(
    () => catalogo.filter(s => !value.includes(s.id)),
    [catalogo, value]
  )

  const selectOptions = useMemo(
    () =>
      disponibles.map(s => ({
        value: s.id,
        label: s.label,
      })),
    [disponibles]
  )

  const addServicio = () => {
    if (!draftId) {
      setDraftError('Seleccione un servicio.')
      return
    }
    if (value.includes(draftId)) {
      setDraftError('Este servicio ya está en la lista.')
      return
    }
    onChange([...value, draftId])
    setDraftId('')
    setDraftError(null)
  }

  const removeServicio = (id: string) => {
    onChange(value.filter(s => s !== id))
  }

  if (readOnly) {
    return (
      <div className="space-y-3">
        {value.length > 0 ? (
          <>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {formatServiciosResumen(value, catalogo)}
            </p>
            <ul className="flex flex-wrap gap-2">
              {value.map(id => {
                const srv = catalogo.find(s => s.id === id)
                if (!srv) return null
                return (
                  <li
                    key={id}
                    className="inline-flex items-center pl-3 pr-3 py-1.5 rounded-xl
                               bg-slate-100 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200
                               border border-slate-200 dark:border-slate-700"
                  >
                    {srv.label}
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">—</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
          <label htmlFor="servicio-draft" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Categoría de servicio
          </label>
          <CustomSelect
            id="servicio-draft"
            value={draftId}
            onChange={v => {
              setDraftId(v)
              setDraftError(null)
            }}
            options={selectOptions}
            placeholder={
              catalogo.length === 0
                ? 'Cargando servicios...'
                : disponibles.length > 0
                  ? 'Seleccionar servicio...'
                  : 'Todos los servicios agregados'
            }
            disabled={catalogo.length === 0 || disponibles.length === 0}
            searchable
            error={!!error && value.length === 0}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={addServicio}
            disabled={catalogo.length === 0 || disponibles.length === 0}
            className="w-full sm:w-auto"
          >
            Agregar servicio
          </Button>
          {draftError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{draftError}</p>
          )}
        </div>
      </div>

      {value.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {formatServiciosResumen(value, catalogo)}
          </p>
          <ul className="flex flex-wrap gap-2">
            {value.map(id => {
              const srv = catalogo.find(s => s.id === id)
              if (!srv) return null
              return (
                <li
                  key={id}
                  className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl
                             bg-slate-100 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200
                             border border-slate-200 dark:border-slate-700"
                >
                  <span>{srv.label}</span>
                  <button
                    type="button"
                    onClick={() => removeServicio(id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50
                               dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
                    aria-label={`Quitar ${srv.label}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
