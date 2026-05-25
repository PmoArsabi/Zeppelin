interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary: `bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white
             shadow-sm shadow-orange-500/25 hover:shadow-orange-500/35
             focus:ring-orange-500/40 disabled:bg-orange-300`,
  secondary: `bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
              border border-slate-200 dark:border-slate-700
              hover:bg-slate-50 dark:hover:bg-slate-700/60
              focus:ring-slate-400/30`,
  ghost: `text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white
          hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-400/30`,
}

const sizes = {
  sm: 'px-3.5 py-2 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold rounded-xl
        transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
