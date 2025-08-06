import { TenantProvider } from '../../contexts/TenantContext'
import ProtectedRoute from '../../components/ProtectedRoute'
import HierarchicalSidebar from '../../components/navigation/HierarchicalSidebar'

export default function ProtectedLayout({ children }) {
  return (
    <TenantProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <HierarchicalSidebar />
          <main className="lg:ml-72 transition-all duration-300 ease-in-out">
            <div className="py-6 px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </ProtectedRoute>
    </TenantProvider>
  )
}