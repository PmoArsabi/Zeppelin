import type { LugarMiceCatalogo } from '../types/mice-catalogos'

interface Props {
  lugares: LugarMiceCatalogo[]
  value: string[]
  onChange: (lugares: string[]) => void
  error?: boolean
  readOnly?: boolean
}

export default function LugarMiceSelect({ lugares, value, onChange, error, readOnly }: Props) {
  const toggle = (lugar: string) => {
    if (readOnly) return
    if (value.includes(lugar)) {
      onChange(value.filter(l => l !== lugar))
    } else {
      onChange([...value, lugar])
    }
  }

  if (lugares.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">Cargando lugares...</p>
    )
  }

  return (
    <div
      className="flex flex-nowrap gap-2"
      role="group"
      aria-label="Tipo de lugar del evento"
    >
      {lugares.map(lugar => {
        const selected = value.includes(lugar.nombre)
        return (
          <button
            key={lugar.id}
            type="button"
            onClick={() => toggle(lugar.nombre)}
            disabled={readOnly}
            className={`
              shrink-0 px-3 py-2 text-sm font-medium rounded-xl border transition-all duration-150
              ${selected
                ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/25'
                : 'bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-500/50'
              }
              ${readOnly ? 'cursor-default opacity-100' : ''}
              ${error && !selected ? 'border-rose-300 dark:border-rose-500/50' : ''}
            `}
            aria-pressed={selected}
          >
            {lugar.nombre}
          </button>
        )
      })}
    </div>
  )
}
