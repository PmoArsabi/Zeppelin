import { lazy } from 'react'
import type { ModuleDefinition } from '@/modules/types'
import { UploadIcon } from '@/modules/icons'

export const cargaSiigoModule: ModuleDefinition = {
  id: 'carga-siigo',
  label: 'Carga Siigo',
  icon: <UploadIcon />,
  unidad: 'siigo',
  component: lazy(() => import('./CargaSiigoModule')),
}
