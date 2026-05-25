import type { ModuleDefinition } from '@/modules/types'
import { MiceIcon } from '@/modules/icons'
import SolicitudesMiceModule from './SolicitudesMiceModule'

export const solicitudesMiceModule: ModuleDefinition = {
  id: 'solicitudes-mice',
  label: 'Solicitud MICE',
  icon: <MiceIcon />,
  unidad: 'mice',
  component: SolicitudesMiceModule,
}
