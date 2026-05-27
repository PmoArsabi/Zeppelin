import { lazy } from 'react'
import type { ModuleDefinition } from '@/modules/types'
import { UsersIcon } from '@/modules/icons'

export const usuariosModule: ModuleDefinition = {
  id: 'usuarios',
  label: 'Usuarios',
  icon: <UsersIcon />,
  allowedRoles: ['admin'],
  component: lazy(() => import('./UsuariosModule')),
}
