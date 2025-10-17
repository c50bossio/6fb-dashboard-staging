'use client'

import AIWidget from '@/components/ai/AIWidget'
import Navigation from '@/components/Navigation'
import DashboardHeader from '@/components/DashboardHeader'
import ProtectedRoute from '@/components/ProtectedRoute'
import { TenantProvider } from '@/contexts/TenantContext'
import { NavigationProvider, useNavigation } from '@/contexts/NavigationContext'
import { GlobalDashboardProvider, useGlobalDashboard } from '@/contexts/GlobalDashboardContext'
import { AIWidgetProvider } from '@/contexts/AIWidgetContext'
import { UnifiedContextProvider } from '@/contexts/UnifiedContextProvider'
import { QueryProvider } from '@/components/QueryProvider'
import GlobalOnboardingWrapper from '@/components/onboarding/GlobalOnboardingWrapper'

function ProtectedLayoutContent({ children }) {
  const { isCollapsed } = useNavigation()
  const { selectedShopId } = useGlobalDashboard()

  return (
    <div className="min-h-screen bg-background">
      {/* Responsive Navigation - handles both mobile and desktop */}
      <Navigation />

      {/* Main Content - Adjust margin based on sidebar collapse state */}
      <main className={`${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} transition-all duration-300 ease-in-out`}>
        {/* Dashboard Header with ViewSwitcher */}
        <DashboardHeader />

        <div className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* AI Widget - Theme-aware, persistent across pages */}
      <AIWidget barbershopId={selectedShopId} position="bottom-right" />
    </div>
  )
}

export default function ProtectedLayout({ children }) {
  return (
    <TenantProvider>
      <QueryProvider>
        <GlobalOnboardingWrapper>
          <ProtectedRoute>
            <GlobalDashboardProvider>
              <UnifiedContextProvider>
                <AIWidgetProvider>
                  <NavigationProvider>
                    <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
                  </NavigationProvider>
                </AIWidgetProvider>
              </UnifiedContextProvider>
            </GlobalDashboardProvider>
          </ProtectedRoute>
        </GlobalOnboardingWrapper>
      </QueryProvider>
    </TenantProvider>
  )
}