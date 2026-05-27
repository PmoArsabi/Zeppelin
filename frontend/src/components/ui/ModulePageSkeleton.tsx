import Skeleton from './Skeleton'

/**
 * Fallback de Suspense para módulos lazy.
 * Se renderiza dentro de AppShell para que sidebar y fondo nunca desaparezcan.
 */
export default function ModulePageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">

      {/* Header — título + botón */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2.5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <Skeleton className="h-9 w-52 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {/* Card tabla */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">

        {/* Cabecera */}
        <div className="flex gap-6 px-5 py-3.5 border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50">
          {[72, 108, 128, 96, 80, 140].map((w, i) => (
            <Skeleton key={i} className="h-3" style={{ width: w }} />
          ))}
        </div>

        {/* Filas — opacidad decreciente para dar sensación de profundidad */}
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-6 items-center px-5 py-3.5 border-b border-slate-100/70 dark:border-gray-800/60 last:border-0"
            style={{ opacity: Math.max(0.15, 1 - i * 0.1) }}
          >
            <Skeleton className="h-3.5 w-20 shrink-0" />
            <Skeleton className="h-3.5 w-28 shrink-0" />
            <Skeleton className="h-3.5 w-32 shrink-0" />
            <Skeleton className="h-3.5 w-24 shrink-0" />
            <Skeleton className="h-3.5 w-20 shrink-0" />
            <Skeleton className="h-5 w-16 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
