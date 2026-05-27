import type { ModuleDefinition } from '@/modules/types'
import { ChartIcon } from '@/modules/icons'
import KpiMiceModule from './KpiMiceModule'

export const kpiMiceModule: ModuleDefinition = {
  id: 'kpi-mice',
  label: 'KPI MICE',
  icon: <ChartIcon />,
  allowedRoles: ['admin', 'coordinador'],
  unidad: 'mice',
  component: KpiMiceModule,
}
