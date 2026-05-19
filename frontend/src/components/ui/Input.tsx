import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ error, className = '', ...props }, ref) => {
  return (
    <input
      ref={ref}
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
})

Input.displayName = 'Input'
export default Input
