import { useState } from 'react'
import CustomSelect from '@/components/ui/CustomSelect'
import type { DocumentoMice, TipoDocumentoMice } from '../types'
import { FACTURA_REGEX, RECIBO_CAJA_REGEX } from '../types'

const TIPO_LABELS: Record<TipoDocumentoMice, string> = {
  factura: 'Factura',
  recibo_caja: 'Recibo de caja',
}

const TIPO_PLACEHOLDER: Record<TipoDocumentoMice, string> = {
  factura: 'Ej. ABCD1234',
  recibo_caja: 'Ej. AB1234',
}

function validateNumero(tipo: TipoDocumentoMice, numero: string): string | null {
  const n = numero.trim().toUpperCase()
  if (!n) return 'El número es obligatorio.'
  if (tipo === 'factura' && !FACTURA_REGEX.test(n)) return 'Formato inválido. Ej: ABCD1234'
  if (tipo === 'recibo_caja' && !RECIBO_CAJA_REGEX.test(n)) return 'Formato inválido. Ej: AB1234'
  return null
}

interface Props {
  value: DocumentoMice[]
  onChange: (docs: DocumentoMice[]) => void
  readOnly?: boolean
  error?: string
}

export default function DocumentosMiceEditor({ value, onChange, readOnly = false, error }: Props) {
  const [tipo, setTipo] = useState<TipoDocumentoMice>('factura')
  const [numero, setNumero] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const add = () => {
    const err = validateNumero(tipo, numero)
    if (err) { setInputError(err); return }
    const normalized = numero.trim().toUpperCase()
    const exists = value.some(d => d.tipo === tipo && d.numero === normalized)
    if (exists) { setInputError('Este documento ya fue agregado.'); return }
    onChange([...value, { tipo, numero: normalized }])
    setNumero('')
    setInputError(null)
  }

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); add() }
  }

  const facturas = value.filter(d => d.tipo === 'factura')
  const recibos = value.filter(d => d.tipo === 'recibo_caja')

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="w-40 shrink-0">
            <CustomSelect
              value={tipo}
              onChange={v => { setTipo(v as TipoDocumentoMice); setInputError(null) }}
              options={[
                { value: 'factura', label: 'Factura' },
                { value: 'recibo_caja', label: 'Recibo de caja' },
              ]}
            />
          </div>
          <div className="flex gap-2 flex-1 min-w-0">
            <input
              type="text"
              value={numero}
              onChange={e => { setNumero(e.target.value); setInputError(null) }}
              onKeyDown={handleKeyDown}
              placeholder={TIPO_PLACEHOLDER[tipo]}
              className={`flex-1 min-w-0 text-xs rounded-lg border px-2.5 py-2
                         bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white
                         placeholder-slate-400 dark:placeholder-slate-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400
                         ${inputError ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}
            />
            <button
              type="button"
              onClick={add}
              className="shrink-0 text-xs font-medium px-3 py-2 rounded-lg
                         bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      {inputError && (
        <p className="text-[11px] text-rose-500 dark:text-rose-400">{inputError}</p>
      )}
      {error && !inputError && (
        <p className="text-[11px] text-rose-500 dark:text-rose-400">{error}</p>
      )}

      {value.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
          {readOnly ? 'Sin documentos registrados.' : 'Agregue facturas y recibos de caja.'}
        </p>
      ) : (
        <div className="space-y-2">
          {[
            { label: 'Facturas', docs: facturas, tipo: 'factura' as TipoDocumentoMice },
            { label: 'Recibos de caja', docs: recibos, tipo: 'recibo_caja' as TipoDocumentoMice },
          ].filter(g => g.docs.length > 0).map(group => (
            <div key={group.tipo}>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.docs.map((doc, idx) => {
                  const globalIdx = value.findIndex(d => d === doc)
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 text-xs font-mono font-medium
                                 px-2.5 py-1 rounded-lg
                                 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300
                                 border border-slate-200 dark:border-slate-700"
                    >
                      {doc.numero}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => remove(globalIdx)}
                          aria-label={`Eliminar ${TIPO_LABELS[doc.tipo]} ${doc.numero}`}
                          className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
