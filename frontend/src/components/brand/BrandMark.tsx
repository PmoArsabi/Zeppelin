/** Ícono de ubicación y wordmark según manual de marca (Viajes naranja, Zeppelin azul). */
export function BrandPinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  )
}

/** Logo oficial (public/Logo.png) */
export function BrandLogo({
  className = '',
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const height =
    size === 'sm' ? 'h-7' : size === 'lg' ? 'h-14' : 'h-9'

  return (
    <img
      src="/Logo.png"
      alt="Viajes Zeppelin"
      className={`${height} w-auto max-w-full object-contain shrink-0 ${className}`}
    />
  )
}

export function BrandWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="text-orange-500">Viajes </span>
      <span className="text-indigo-600 dark:text-indigo-400">Zeppelin</span>
    </span>
  )
}

export function BrandLogoBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const box =
    size === 'sm' ? 'w-6 h-6 rounded-lg' : size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-8 h-8 rounded-xl'
  const icon = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-7 h-7' : 'w-4 h-4'
  const shadow =
    size === 'lg' ? 'shadow-lg shadow-indigo-600/25' : 'shadow-sm shadow-indigo-600/30'

  return (
    <div
      className={`${box} ${shadow} bg-indigo-600 flex items-center justify-center shrink-0`}
      aria-hidden
    >
      <BrandPinIcon className={`${icon} text-white`} />
    </div>
  )
}
