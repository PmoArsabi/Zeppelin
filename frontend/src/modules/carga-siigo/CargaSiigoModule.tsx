import AppShell from '@/components/layout/AppShell'
import type { NavigateFn } from '@/modules/types'
import CargaSiigoPage from './pages/CargaSiigoPage'

interface Props {
  onNavigate: NavigateFn
}

export default function CargaSiigoModule({ onNavigate }: Props) {
  return (
    <AppShell activeModule="carga-siigo" onNavigate={onNavigate}>
      <CargaSiigoPage />
    </AppShell>
  )
}
