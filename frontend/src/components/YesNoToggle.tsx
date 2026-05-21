interface YesNoToggleProps {
  value: boolean | null
  onChange: (v: boolean) => void
  error?: boolean
  disabled?: boolean
}

export default function YesNoToggle({ value, onChange, error, disabled }: YesNoToggleProps) {
  return (
    <div className={`inline-flex rounded-xl border overflow-hidden transition-all ${error ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}>
      {([true, false] as const).map((opt) => {
        const isActive = value === opt
        const label = opt ? 'Sí' : 'No'
        return (
          <button
            key={String(opt)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`
              disabled:opacity-50 disabled:cursor-not-allowed
              px-5 py-2.5 text-sm font-semibold transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-inset
              ${isActive
                ? opt
                  ? 'bg-emerald-500 text-white focus:ring-emerald-400'
                  : 'bg-rose-500 text-white focus:ring-rose-400'
                : 'bg-white dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 focus:ring-slate-300'
              }
            `}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
