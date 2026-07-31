import { lazy } from 'react'
import type { ModuleDefinition } from '@/modules/types'
import { ChartPieIcon } from '@/modules/icons'

export const informesPowerbiModule: ModuleDefinition = {
  id: 'informes-powerbi',
  label: 'Informes PowerBI',
  icon: <ChartPieIcon />,
  requiresPowerbiInformes: true,
  component: lazy(() => import('./InformesPowerbiModule')),
}
