import type { ComponentProps } from 'react'
import EstadoKpiBar, { buildEstadoKpiItems, type EstadoKpiItem } from '@/components/filters/EstadoKpiBar'
import type { BadgeVariant } from '@/components/ui/Badge'
import { estadoColor } from '../lib/estadoColors'

export type { EstadoKpiItem }
// eslint-disable-next-line react-refresh/only-export-components
export { buildEstadoKpiItems }

const MICE_ESTADO_ORDER = [
  'En cotización',
  'Cotización Enviada',
  'Abierto',
  'En operación',
  'En cierre',
  'Cerrado',
  'No adjudicado - No ganado',
  'No adjudicado -No ganado',
  'Cancelado',
]

function miceBadgeVariant(estado: string): BadgeVariant {
  if (estado === 'Cerrado') return 'emerald'
  if (estado === 'Cancelado') return 'rose'
  return 'amber'
}

type Props = Omit<ComponentProps<typeof EstadoKpiBar>, 'badgeVariant'>

export default function MiceEstadoKpiBar(props: Props) {
  return <EstadoKpiBar {...props} badgeVariant={miceBadgeVariant} estadoAccent={estadoColor} />
}

// eslint-disable-next-line react-refresh/only-export-components
export function buildMiceEstadoKpiItems(rows: { estado: string }[]): EstadoKpiItem[] {
  return buildEstadoKpiItems(rows, MICE_ESTADO_ORDER)
}
