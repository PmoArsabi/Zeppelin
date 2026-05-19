import Label from './Label'

interface FormFieldProps {
  label: string
  required?: boolean
  optional?: boolean
  error?: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
  counter?: { current: number; max: number }
}

export default function FormField({
  label,
  required,
  optional,
  error,
  hint,
  htmlFor,
  children,
  className = '',
  counter,
}: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-0 ${className}`}>
      <Label htmlFor={htmlFor} required={required} optional={optional}>
        {label}
      </Label>
      {children}
      <div className="flex items-start justify-between mt-1.5 min-h-4">
        <div>
          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM9 9a1 1 0 112 0v3a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          {!error && hint && (
            <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
          )}
        </div>
        {counter && (
          <span className={`text-xs ml-auto shrink-0 ${counter.current > counter.max * 0.9 ? 'text-amber-500' : 'text-slate-400'}`}>
            {counter.current}/{counter.max}
          </span>
        )}
      </div>
    </div>
  )
}
