import type { NavigateFn } from '@/modules/types'
import UsuariosPage from '@/pages/UsuariosPage'

interface Props {
  onNavigate: NavigateFn
}

export default function UsuariosModule({ onNavigate }: Props) {
  return <UsuariosPage onNavigate={onNavigate} />
}
