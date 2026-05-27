import { lazy } from 'react'
import type { ModuleDefinition } from '@/modules/types'
import { ChartIcon } from '@/modules/icons'

export const kpiMiceModule: ModuleDefinition = {
  id: 'kpi-mice',
  label: 'KPI MICE',
  icon: <ChartIcon />,
  allowedRoles: ['admin', 'coordinador'],
  unidad: 'mice',
  component: lazy(() => import('./KpiMiceModule')),
}
