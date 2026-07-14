import { lazy } from 'react'
import type { ModuleDefinition } from '@/modules/types'
import { CashIcon } from '@/modules/icons'

export const anticiposModule: ModuleDefinition = {
  id: 'anticipos',
  label: 'Anticipos',
  icon: <CashIcon />,
  unidad: 'anticipos',
  component: lazy(() => import('./AnticiposModule')),
}
