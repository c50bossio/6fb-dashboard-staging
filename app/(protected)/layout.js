'use client'

import FloatingAIChat from '../../components/FloatingAIChat'
import Navigation from '../../components/Navigation'
import ProtectedRoute from '../../components/ProtectedRoute'
import { TenantProvider } from '../../contexts/TenantContext'
import { NavigationProvider, useNavigation } from '../../contexts/NavigationContext'

function ProtectedLayoutContent({ children }) {
  const { isCollapsed } = useNavigation()
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Responsive Navigation - handles both mobile and desktop */}
      <Navigation />
      
      {/* Main Content - Adjust margin based on sidebar collapse state */}
      <main className={`${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} transition-all duration-300 ease-in-out pt-16 lg:pt-0 pb-20 lg:pb-0`}>
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      
      {/* Floating AI Chat - Hidden on mobile for better UX */}
      <div className="hidden lg:block">
        <FloatingAIChat />
      </div>
    </div>
  )
}

export default function ProtectedLayout({ children }) {
  return (
    <TenantProvider>
      <ProtectedRoute>
        <NavigationProvider>
          <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
        </NavigationProvider>
      </ProtectedRoute>
    </TenantProvider>
  )
}