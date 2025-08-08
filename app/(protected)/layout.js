import FloatingAIChat from '../../components/FloatingAIChat'
import Navigation from '../../components/Navigation'
import MobileNavigation from '../../components/MobileNavigation'
import ProtectedRoute from '../../components/ProtectedRoute'
import { TenantProvider } from '../../contexts/TenantContext'

export default function ProtectedLayout({ children }) {
  return (
    <TenantProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          {/* Desktop Navigation */}
          <div className="hidden lg:block">
            <Navigation />
          </div>
          
          {/* Mobile Navigation */}
          <MobileNavigation />
          
          {/* Main Content */}
          <main className="lg:ml-80 transition-all duration-300 ease-in-out pt-16 lg:pt-0 pb-20 lg:pb-0">
            <div className="py-6 px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
          
          {/* Floating AI Chat - Hidden on mobile for better UX */}
          <div className="hidden lg:block">
            <FloatingAIChat />
          </div>
        </div>
      </ProtectedRoute>
    </TenantProvider>
  )
}