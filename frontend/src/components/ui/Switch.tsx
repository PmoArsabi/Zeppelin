interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  color?: 'indigo' | 'amber' | 'emerald'
}

const TRACK_ON: Record<NonNullable<SwitchProps['color']>, string> = {
  indigo: 'bg-indigo-500/15 border-indigo-400/60 dark:bg-indigo-400/10 dark:border-indigo-400/40',
  amber: 'bg-amber-500/15 border-amber-400/60 dark:bg-amber-400/10 dark:border-amber-400/40',
  emerald: 'bg-emerald-500/15 border-emerald-400/60 dark:bg-emerald-400/10 dark:border-emerald-400/40',
}

const THUMB_ON: Record<NonNullable<SwitchProps['color']>, string> = {
  indigo: 'bg-indigo-500 dark:bg-indigo-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  emerald: 'bg-emerald-500 dark:bg-emerald-400',
}

const LABEL_ON: Record<NonNullable<SwitchProps['color']>, string> = {
  indigo: 'text-indigo-700 dark:text-indigo-300',
  amber: 'text-amber-700 dark:text-amber-300',
  emerald: 'text-emerald-700 dark:text-emerald-300',
}

const RING_ON: Record<NonNullable<SwitchProps['color']>, string> = {
  indigo: 'focus-visible:ring-indigo-500/30',
  amber: 'focus-visible:ring-amber-500/30',
  emerald: 'focus-visible:ring-emerald-500/30',
}

/** Toggle tipo switch reutilizable, con bolita deslizante y estado on/off. */
export default function Switch({ checked, onChange, label, disabled = false, color = 'indigo' }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-full border pl-0.5 pr-2.5 py-0.5
                  transition-colors cursor-pointer select-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus-visible:ring-2 ${RING_ON[color]}
                  ${
                    checked
                      ? TRACK_ON[color]
                      : 'bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-700'
                  }`}
    >
      <span
        className={`relative flex h-4 w-7 items-center rounded-full transition-colors
                    ${checked ? THUMB_ON[color] : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span
          className={`absolute h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 ease-out
                      ${checked ? 'translate-x-3.5' : 'translate-x-0.5'}`}
        />
      </span>
      {label != null && (
        <span
          className={`text-xs font-medium ${checked ? LABEL_ON[color] : 'text-slate-500 dark:text-slate-400'}`}
        >
          {label}
        </span>
      )}
    </button>
  )
}
