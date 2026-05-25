import type { ModuleDefinition } from '@/modules/types'
import { UsersIcon } from '@/modules/icons'
import UsuariosModule from './UsuariosModule'

export const usuariosModule: ModuleDefinition = {
  id: 'usuarios',
  label: 'Usuarios',
  icon: <UsersIcon />,
  allowedRoles: ['admin'],
  component: UsuariosModule,
}
