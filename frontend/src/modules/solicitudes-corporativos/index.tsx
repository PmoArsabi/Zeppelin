import { lazy } from 'react'
import type { ModuleDefinition } from '@/modules/types'
import { DocumentIcon } from '@/modules/icons'

export const solicitudesCorporativosModule: ModuleDefinition = {
  id: 'solicitudes-corporativos',
  label: 'Solicitud Corp',
  icon: <DocumentIcon />,
  unidad: 'corp',
  component: lazy(() => import('./SolicitudesCorporativosModule')),
}

export type { SolicitudEdit } from './types'
