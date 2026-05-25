import type { ModuleDefinition } from '@/modules/types'
import { ShieldIcon } from '@/modules/icons'
import RolesPermisosModule from './RolesPermisosModule'

export const rolesPermisosModule: ModuleDefinition = {
  id: 'roles-permisos',
  label: 'Roles y Permisos',
  icon: <ShieldIcon />,
  allowedRoles: ['admin'],
  component: RolesPermisosModule,
}
