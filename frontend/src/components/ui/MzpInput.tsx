import Input from './Input'
import { MZP_PREFIX, mzpFromSuffix, mzpSuffix, MZP_SUFFIX_MAX } from '@/lib/mzpFormat'

interface MzpInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  error?: boolean
  disabled?: boolean
}

/** Código MZP: prefijo fijo + hasta 3 dígitos (6 caracteres en total). */
export default function MzpInput({ id, value, onChange, error, disabled }: MzpInputProps) {
  const suffix = mzpSuffix(value)

  return (
    <div
      className={`flex rounded-xl overflow-hidden border focus-within:ring-2 focus-within:ring-offset-0
        ${error
          ? 'border-rose-400 dark:border-rose-500 focus-within:ring-rose-400/30'
          : 'border-slate-200 dark:border-slate-700 focus-within:ring-indigo-500/25 focus-within:border-indigo-400 dark:focus-within:border-indigo-500'
        }`}
    >
      <span
        className="shrink-0 flex items-center px-4 py-3 text-sm font-mono font-semibold
                   bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
                   border-r border-slate-200 dark:border-slate-700 select-none"
        aria-hidden
      >
        {MZP_PREFIX}
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        maxLength={MZP_SUFFIX_MAX}
        value={suffix}
        placeholder="001"
        error={error}
        disabled={disabled}
        onChange={e => onChange(mzpFromSuffix(e.target.value))}
        className="rounded-none border-0 focus:ring-0 font-mono"
        aria-label="Sufijo código MZP (3 dígitos)"
      />
    </div>
  )
}
