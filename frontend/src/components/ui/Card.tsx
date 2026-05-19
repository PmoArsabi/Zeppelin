interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  step?: number
  title: string
  description?: string
}

export function CardHeader({ step, title, description }: CardHeaderProps) {
  return (
    <div className="px-7 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-3">
        {step !== undefined && (
          <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center ring-1 ring-indigo-200 dark:ring-indigo-500/30">
            {step}
          </span>
        )}
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function CardBody({ children, className = '' }: CardProps) {
  return (
    <div className={`px-7 py-6 ${className}`}>
      {children}
    </div>
  )
}
