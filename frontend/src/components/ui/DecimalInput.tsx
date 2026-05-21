import { forwardRef, useState } from 'react'
import { formatDecimalCO, maskDecimalCOInput } from '@/lib/decimalFormat'

interface DecimalInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  error?: boolean
}

const DecimalInput = forwardRef<HTMLInputElement, DecimalInputProps>(
  ({ value, onChange, error, className = '', onBlur, onFocus, placeholder = '0', ...props }, ref) => {
    const [focused, setFocused] = useState(false)

    const displayValue = focused ? value : (value ? formatDecimalCO(value) : '')

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={displayValue}
        placeholder={placeholder}
        onFocus={e => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={e => {
          setFocused(false)
          if (value.trim()) onChange(formatDecimalCO(value))
          onBlur?.(e)
        }}
        onChange={e => onChange(maskDecimalCOInput(e.target.value))}
        className={`
          w-full px-4 py-3 text-sm rounded-xl border transition-all duration-150
          bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white
          placeholder-slate-400 dark:placeholder-slate-500
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error
            ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-400/30 focus:border-rose-400'
            : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/25 focus:border-indigo-400 dark:focus:border-indigo-500'
          }
          ${className}
        `}
        {...props}
      />
    )
  }
)

DecimalInput.displayName = 'DecimalInput'
export default DecimalInput
