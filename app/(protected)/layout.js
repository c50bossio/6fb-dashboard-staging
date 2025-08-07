import FloatingAIChat from '../../components/FloatingAIChat'
import ModernSidebar from '../../components/navigation/ModernSidebar'
import ProtectedRoute from '../../components/ProtectedRoute'
import { TenantProvider } from '../../contexts/TenantContext'

export default function ProtectedLayout({ children }) {
  return (
    <TenantProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <ModernSidebar />
          <main className="lg:ml-72 transition-all duration-300 ease-in-out">
            <div className="py-6 px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
          <FloatingAIChat />
        </div>
      </ProtectedRoute>
    </TenantProvider>
  )
}