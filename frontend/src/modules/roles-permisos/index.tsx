import { lazy } from 'react'
import type { ModuleDefinition } from '@/modules/types'
import { ShieldIcon } from '@/modules/icons'

export const rolesPermisosModule: ModuleDefinition = {
  id: 'roles-permisos',
  label: 'Roles y Permisos',
  icon: <ShieldIcon />,
  allowedRoles: ['admin'],
  component: lazy(() => import('./RolesPermisosModule')),
}
