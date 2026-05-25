import type { ReactNode } from 'react'
import type { BadgeVariant } from '@/components/ui/Badge'

const ICON_CLASS = 'w-3.5 h-3.5 shrink-0'

function Svg({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <svg
      className={className ?? ICON_CLASS}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function IconKpiTotal({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </Svg>
  )
}

/** Cerrado / Finalizado — apretón de manos (acuerdo cerrado) */
function IconHandsDeal({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l.88-.88a5 5 0 0 1 7.07 0l1.06 1.06"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="m2 9 2 2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-2 2" />
    </Svg>
  )
}

function IconClipboard({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c1.07.013 2.048.547 2.624 1.416a48.416 48.416 0 00-1.123.08M15 12.75H9m6-3.75V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M9.75 4.5V3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V4.5m-6 0h12"
      />
    </Svg>
  )
}

function IconPaperAirplane({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </Svg>
  )
}

function IconFolderOpen({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a2.25 2.25 0 011.59.659l2.122 2.122c.281.281.664.44 1.06.44H18A2.25 2.25 0 0120.25 9v.776"
      />
    </Svg>
  )
}

function IconCog({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </Svg>
  )
}

function IconArchive({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </Svg>
  )
}

function IconXCircle({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </Svg>
  )
}

function IconThumbDown({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 15h2.25m8.024-9.75c.011.05.008.102.008.152a2.25 2.25 0 01-1.43 2.022L18 9.75v1.5c0 .83-.67 1.5-1.5 1.5H9.75v4.5c0 .414-.336.75-.75.75h-1.5a.75.75 0 01-.75-.75v-7.5A2.25 2.25 0 016 7.5h2.25m0 0V6a2.25 2.25 0 012.25-2.25h3.75A2.25 2.25 0 0115.75 6v1.5"
      />
    </Svg>
  )
}

function IconClock({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </Svg>
  )
}

function IconArrows({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </Svg>
  )
}

function IconDocReject({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l6-6m0 6L9 9" />
    </Svg>
  )
}

function normEstadoKey(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/** Icono representativo por nombre de estado (MICE + Corporativo) */
// eslint-disable-next-line react-refresh/only-export-components
export function resolveEstadoKpiIcon(nombre: string, className?: string): ReactNode {
  const k = normEstadoKey(nombre)

  if (k === 'cerrado' || k === 'finalizado') {
    return <IconHandsDeal className={className} />
  }
  if (k.includes('cotizacion') && k.includes('enviada')) {
    return <IconPaperAirplane className={className} />
  }
  if (k.includes('en cotizacion')) {
    return <IconClipboard className={className} />
  }
  if (k === 'abierto') {
    return <IconFolderOpen className={className} />
  }
  if (k.includes('operacion')) {
    return <IconCog className={className} />
  }
  if (k.includes('cierre')) {
    return <IconArchive className={className} />
  }
  if (k === 'cancelado' || k === 'anulado') {
    return <IconXCircle className={className} />
  }
  if (k.includes('rechazada')) {
    return <IconDocReject className={className} />
  }
  if (k === 'no ganado' || k.includes('no ganado') || k.includes('no adjudicado')) {
    return <IconThumbDown className={className} />
  }
  if (k === 'pendiente') {
    return <IconClock className={className} />
  }
  if (k.includes('tramite')) {
    return <IconArrows className={className} />
  }

  return <IconFolderOpen className={className} />
}

// eslint-disable-next-line react-refresh/only-export-components
export function iconColorForVariant(variant: BadgeVariant): string {
  const map: Record<BadgeVariant, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
    slate: 'text-slate-500 dark:text-slate-400',
    violet: 'text-violet-600 dark:text-violet-400',
  }
  return map[variant]
}

// eslint-disable-next-line react-refresh/only-export-components
export function iconBgForVariant(variant: BadgeVariant): string {
  const map: Record<BadgeVariant, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/15',
    blue: 'bg-blue-50 dark:bg-blue-500/15',
    amber: 'bg-amber-50 dark:bg-amber-500/15',
    rose: 'bg-rose-50 dark:bg-rose-500/15',
    slate: 'bg-slate-100 dark:bg-slate-800',
    violet: 'bg-violet-50 dark:bg-violet-500/15',
  }
  return map[variant]
}

// eslint-disable-next-line react-refresh/only-export-components
export function valueColorForVariant(variant: BadgeVariant): string {
  const map: Record<BadgeVariant, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-400',
    blue: 'text-blue-700 dark:text-blue-400',
    amber: 'text-amber-700 dark:text-amber-400',
    rose: 'text-rose-700 dark:text-rose-400',
    slate: 'text-slate-800 dark:text-slate-200',
    violet: 'text-violet-700 dark:text-violet-400',
  }
  return map[variant]
}

// eslint-disable-next-line react-refresh/only-export-components
export function kpiActiveRingForVariant(variant: BadgeVariant): string {
  const map: Record<BadgeVariant, string> = {
    emerald: 'ring-2 ring-emerald-500/40',
    blue: 'ring-2 ring-blue-500/40',
    amber: 'ring-2 ring-orange-500/40',
    rose: 'ring-2 ring-rose-500/40',
    slate: 'ring-2 ring-slate-400/40',
    violet: 'ring-2 ring-violet-500/40',
  }
  return map[variant]
}
