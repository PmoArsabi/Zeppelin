import type { ModuleDefinition } from '@/modules/types'
import { DocumentIcon } from '@/modules/icons'
import SolicitudesCorporativosModule from './SolicitudesCorporativosModule'

export const solicitudesCorporativosModule: ModuleDefinition = {
  id: 'solicitudes-corporativos',
  label: 'Solicitud Corp',
  icon: <DocumentIcon />,
  unidad: 'corp',
  component: SolicitudesCorporativosModule,
}

export type { SolicitudEdit } from './types'
