import { forwardRef } from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  compact?: boolean
  children: React.ReactNode
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, compact = false, className = '', children, ...props }, ref) => {
    const sizeClass = compact
      ? 'px-2.5 py-1.5 pr-8 text-xs rounded-lg min-h-8'
      : 'px-4 py-3 pr-10 text-sm rounded-xl'

    return (
      <div className="relative">
        <select
          ref={ref}
          className={`
          w-full appearance-none border transition-all duration-150
          bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClass}
          ${error
            ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-400/30 focus:border-rose-400'
            : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/25 focus:border-indigo-400 dark:focus:border-indigo-500'
          }
          ${className}
        `}
          {...props}
        >
          {children}
        </select>
        <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center ${compact ? 'pr-2' : 'pr-3.5'}`}>
          <svg
            className={`text-slate-400 ${compact ? 'w-3 h-3' : 'w-4 h-4'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    )
  }
)

Select.displayName = 'Select'
export default Select
