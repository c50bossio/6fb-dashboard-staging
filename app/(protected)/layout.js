import { TenantProvider } from '../../contexts/TenantContext'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function ProtectedLayout({ children }) {
  return (
    <TenantProvider>
      <ProtectedRoute>
        {children}
      </ProtectedRoute>
    </TenantProvider>
  )
}