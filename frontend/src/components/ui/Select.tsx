import { forwardRef } from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  children: React.ReactNode
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ error, className = '', children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={`
          w-full appearance-none px-4 py-3 pr-10 text-sm rounded-xl border transition-all duration-150
          bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
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
      {/* Custom chevron */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
})

Select.displayName = 'Select'
export default Select
