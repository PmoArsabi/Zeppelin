import type { NavigateFn } from '@/modules/types'
import RolesPermisosPage from './pages/RolesPermisosPage'

export default function RolesPermisosModule({ onNavigate }: { onNavigate: NavigateFn }) {
  return <RolesPermisosPage onNavigate={onNavigate} />
}
