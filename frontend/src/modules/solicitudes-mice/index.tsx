import { lazy } from 'react'
import type { ModuleDefinition } from '@/modules/types'
import { MiceIcon } from '@/modules/icons'

export const solicitudesMiceModule: ModuleDefinition = {
  id: 'solicitudes-mice',
  label: 'Solicitud MICE',
  icon: <MiceIcon />,
  unidad: 'mice',
  component: lazy(() => import('./SolicitudesMiceModule')),
}
