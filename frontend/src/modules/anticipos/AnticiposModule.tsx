import AppShell from '@/components/layout/AppShell'
import type { NavigateFn } from '@/modules/types'
import AnticiposListPage from './pages/AnticiposListPage'

interface Props {
  onNavigate: NavigateFn
}

export default function AnticiposModule({ onNavigate }: Props) {
  return (
    <AppShell activeModule="anticipos" onNavigate={onNavigate}>
      <AnticiposListPage />
    </AppShell>
  )
}
