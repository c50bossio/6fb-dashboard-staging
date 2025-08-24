'use client'

import { useEffect } from 'react'
import DashboardHeader from '../../components/dashboard/DashboardHeader'
import FloatingAIChat from '../../components/FloatingAIChat'
import Navigation from '../../components/Navigation'
import ProtectedRoute from '../../components/ProtectedRoute'
import { NavigationProvider, useNavigation } from '../../contexts/NavigationContext'
import { TenantProvider } from '../../contexts/TenantContext'
import { GlobalDashboardProvider } from '../../contexts/GlobalDashboardContext'
import { useAuth } from '../../components/SupabaseAuthProvider'
// import { Toaster } from 'react-hot-toast'

function ProtectedLayoutContent({ children }) {
  const { isCollapsed } = useNavigation()
  const { user, profile, refreshProfile } = useAuth()
  
  // Check for Stripe success parameter and show simple notification
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const stripeSuccess = urlParams.get('stripe_success') === 'true'
    
    if (stripeSuccess) {
      // Show success notification (could add a toast here)
      console.log('✅ Payment setup completed successfully!')
      
      // Clean up URL params
      const newUrl = new URL(window.location)
      newUrl.searchParams.delete('stripe_success')
      window.history.replaceState({}, document.title, newUrl.pathname)
    }
  }, [])
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Responsive Navigation - handles both mobile and desktop */}
      <Navigation />
      
      {/* Main Content - Adjust margin based on sidebar collapse state */}
      <main className={`${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} transition-all duration-300 ease-in-out`}>
        <DashboardHeader />
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      
      {/* Floating AI Chat - Hidden on mobile for better UX */}
      <div className="hidden lg:block">
        <FloatingAIChat />
      </div>
      
      {/* Toast notifications for the entire app */}
      {/* <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      /> */}
    </div>
  )
}

export default function ProtectedLayout({ children }) {
  return (
    <TenantProvider>
      <ProtectedRoute>
        <NavigationProvider>
          <GlobalDashboardProvider>
            <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
          </GlobalDashboardProvider>
        </NavigationProvider>
      </ProtectedRoute>
    </TenantProvider>
  )
}