import { useMemo, useState } from 'react'
import CustomSelect from '@/components/ui/CustomSelect'
import Button from '@/components/ui/Button'
import type { DestinoMice } from '../types'
import type { MiceCatalogos } from '../types/mice-catalogos'
import { ciudadesCatalogoPorPais } from '../services/miceCatalogosService'

interface Props {
  catalog: MiceCatalogos
  value: DestinoMice[]
  onChange: (destinos: DestinoMice[]) => void
  readOnly?: boolean
}

export default function DestinosMiceEditor({ catalog, value, onChange, readOnly }: Props) {
  const [draftPais, setDraftPais] = useState('')
  const [draftCiudad, setDraftCiudad] = useState('')
  const [draftError, setDraftError] = useState<string | null>(null)

  const ciudadesOpciones = useMemo(() => {
    if (!draftPais) return []
    return ciudadesCatalogoPorPais(catalog, draftPais).map(c => ({
      value: c.nombre,
      label: c.nombre,
    }))
  }, [catalog, draftPais])

  const paisOptions = useMemo(
    () => catalog.paises.map(p => ({ value: p.nombre, label: p.nombre })),
    [catalog.paises]
  )

  const handlePaisChange = (pais: string) => {
    setDraftPais(pais)
    setDraftCiudad('')
    setDraftError(null)
  }

  const addDestino = () => {
    if (!draftPais) {
      setDraftError('Seleccione un país.')
      return
    }
    if (!draftCiudad) {
      setDraftError('Seleccione una ciudad.')
      return
    }
    const dup = value.some(d => d.pais === draftPais && d.ciudad === draftCiudad)
    if (dup) {
      setDraftError('Este destino ya está en la lista.')
      return
    }
    onChange([...value, { pais: draftPais, ciudad: draftCiudad }])
    setDraftPais('')
    setDraftCiudad('')
    setDraftError(null)
  }

  const removeDestino = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  if (readOnly) {
    return value.length > 0 ? (
      <ul className="flex flex-wrap gap-2">
        {value.map((d, i) => (
          <li
            key={`${d.pais}-${d.ciudad}-${i}`}
            className="inline-flex items-center pl-3 pr-3 py-1.5 rounded-xl
                       bg-slate-100 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200
                       border border-slate-200 dark:border-slate-700"
          >
            <span className="font-medium">{d.pais}</span>
            <span className="text-slate-500 dark:text-slate-400"> — </span>
            {d.ciudad}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-slate-500 dark:text-slate-400">—</p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="destino-pais" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            País destino
          </label>
          <CustomSelect
            id="destino-pais"
            value={draftPais}
            onChange={handlePaisChange}
            options={paisOptions}
            placeholder={paisOptions.length ? 'Seleccionar país...' : 'Cargando países...'}
            disabled={paisOptions.length === 0}
            searchable
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="destino-ciudad" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Ciudad destino
          </label>
          <CustomSelect
            id="destino-ciudad"
            value={draftCiudad}
            onChange={v => {
              setDraftCiudad(v)
              setDraftError(null)
            }}
            options={ciudadesOpciones}
            placeholder={draftPais ? 'Seleccionar ciudad...' : 'Primero elija un país'}
            disabled={!draftPais}
            searchable
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-2 flex flex-col gap-1">
          <Button type="button" variant="secondary" size="md" onClick={addDestino} className="w-full sm:w-auto">
            Agregar destino
          </Button>
          {draftError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{draftError}</p>
          )}
        </div>
      </div>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((d, i) => (
            <li
              key={`${d.pais}-${d.ciudad}-${i}`}
              className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl
                         bg-slate-100 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200
                         border border-slate-200 dark:border-slate-700"
            >
              <span>
                <span className="font-medium">{d.pais}</span>
                <span className="text-slate-500 dark:text-slate-400"> — </span>
                {d.ciudad}
              </span>
              <button
                type="button"
                onClick={() => removeDestino(i)}
                className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50
                           dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
                aria-label={`Quitar ${d.pais}, ${d.ciudad}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Puede agregar varios destinos (ej. Panamá — Ciudad de Panamá; República Dominicana — Punta Cana).
        </p>
      )}
    </div>
  )
}
