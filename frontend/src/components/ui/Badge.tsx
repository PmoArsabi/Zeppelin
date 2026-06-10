export type BadgeVariant = 'emerald' | 'amber' | 'blue' | 'slate' | 'rose' | 'violet'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  /** Color de texto/borde personalizado (hex). Si se indica, ignora `variant`. */
  colorHex?: string
  /** Color de fondo personalizado (claro). Requiere `colorHex`. */
  bgHex?: string
  /** Color de fondo personalizado (oscuro). Requiere `colorHex`. */
  bgHexDark?: string
}

const variants: Record<BadgeVariant, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
  amber:   'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
  blue:    'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
  slate:   'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20',
  rose:    'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20',
  violet:  'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20',
}

export default function Badge({ variant = 'slate', children, className = '', colorHex, bgHex, bgHexDark }: BadgeProps) {
  if (colorHex) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset dark:bg-(--badge-bg-dark) ${className}`}
        style={{
          color: colorHex,
          borderColor: colorHex,
          backgroundColor: bgHex,
          ['--badge-bg-dark' as string]: bgHexDark ?? bgHex,
        }}
      >
        {children}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
