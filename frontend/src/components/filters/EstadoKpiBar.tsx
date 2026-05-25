import type { ReactNode } from 'react'
import type { BadgeVariant } from '@/components/ui/Badge'
import {
  IconKpiTotal,
  iconBgForVariant,
  iconColorForVariant,
  kpiActiveRingForVariant,
  resolveEstadoKpiIcon,
  valueColorForVariant,
} from './estadoKpiIcons'

export type EstadoKpiItem = { nombre: string; count: number }

export function sortEstadoKpiItems(items: EstadoKpiItem[], pipelineOrder: string[]): EstadoKpiItem[] {
  return [...items].sort((a, b) => {
    const ia = pipelineOrder.indexOf(a.nombre)
    const ib = pipelineOrder.indexOf(b.nombre)
    if (ia === -1 && ib === -1) return a.nombre.localeCompare(b.nombre, 'es')
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

export function buildEstadoKpiItems(
  rows: { estado: string }[],
  pipelineOrder: string[] = []
): EstadoKpiItem[] {
  const counts = new Map<string, number>()
  for (const r of rows) {
    counts.set(r.estado, (counts.get(r.estado) ?? 0) + 1)
  }
  return sortEstadoKpiItems(
    [...counts.entries()].map(([nombre, count]) => ({ nombre, count })),
    pipelineOrder
  )
}

const CARD_BASE =
  'shrink-0 snap-start flex items-center justify-between gap-2 min-w-[6.75rem] max-w-[9.5rem] ' +
  'rounded-xl bg-white dark:bg-gray-900 px-2.5 py-2 shadow-sm hover:shadow-md transition-all'

interface KpiCardProps {
  label: string
  count: number
  pct?: string
  active: boolean
  activeRingClass?: string
  valueClass: string
  iconBoxClass: string
  icon: ReactNode
  title?: string
  onClick: () => void
}

function KpiCard({
  label,
  count,
  pct,
  active,
  activeRingClass = '',
  valueClass,
  iconBoxClass,
  icon,
  title,
  onClick,
}: KpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className={`${CARD_BASE} text-left ${active ? activeRingClass : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] leading-tight text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className={`text-lg font-bold tabular-nums leading-none ${valueClass}`}>{count}</span>
          {pct != null && (
            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">{pct}</span>
          )}
        </div>
      </div>
      <div
        className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${iconBoxClass}`}
        aria-hidden
      >
        {icon}
      </div>
    </button>
  )
}

interface Props {
  items: EstadoKpiItem[]
  total: number
  activeEstados: string[]
  badgeVariant: (estado: string) => BadgeVariant
  estadoIcon?: (nombre: string, variant: BadgeVariant) => ReactNode
  filteredView?: boolean
  onToggleEstado: (nombre: string) => void
  onClearEstadoFilter: () => void
}

export default function EstadoKpiBar({
  items,
  total,
  activeEstados,
  badgeVariant,
  estadoIcon,
  filteredView = false,
  onToggleEstado,
  onClearEstadoFilter,
}: Props) {
  const iconSize = 'w-4 h-4'

  const renderIcon = (nombre: string, variant: BadgeVariant) => {
    const iconClass = `${iconSize} ${iconColorForVariant(variant)}`
    if (estadoIcon) return estadoIcon(nombre, variant)
    return resolveEstadoKpiIcon(nombre, iconClass)
  }

  if (total === 0 && items.length === 0) return null

  return (
    <section className="mb-4" aria-label="Resumen por estado">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {filteredView ? 'Resumen (filtros aplicados)' : 'Resumen por estado'}
        </p>
        {activeEstados.length > 0 && (
          <button
            type="button"
            onClick={onClearEstadoFilter}
            className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Quitar filtro de estado
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 md:flex md:flex-nowrap md:overflow-x-auto md:gap-2 md:pb-0.5 -mx-0.5 px-0.5 md:snap-x md:snap-mandatory">
        <KpiCard
          label="Total"
          count={total}
          active={false}
          valueClass="text-slate-800 dark:text-slate-100"
          iconBoxClass="bg-slate-100 dark:bg-slate-800"
          icon={<IconKpiTotal className={`${iconSize} text-slate-500 dark:text-slate-400`} />}
          onClick={onClearEstadoFilter}
        />

        {items.map(({ nombre, count }) => {
          const active = activeEstados.length === 1 && activeEstados[0] === nombre
          const variant = badgeVariant(nombre)
          const pct = total > 0 ? `${Math.round((count / total) * 100)}%` : undefined
          return (
            <KpiCard
              key={nombre}
              label={nombre}
              count={count}
              pct={pct}
              active={active}
              activeRingClass={kpiActiveRingForVariant(variant)}
              valueClass={valueColorForVariant(variant)}
              iconBoxClass={iconBgForVariant(variant)}
              icon={renderIcon(nombre, variant)}
              title={`Filtrar por ${nombre}`}
              onClick={() => onToggleEstado(nombre)}
            />
          )
        })}
      </div>
    </section>
  )
}
