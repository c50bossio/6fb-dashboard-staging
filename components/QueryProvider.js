'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect } from 'react'
import { queryClient } from '@/lib/query-client'
import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'

/**
 * React Query Provider with Supabase Service Integration
 * Provides query client and initializes the Supabase service layer
 */
export function QueryProvider({ children }) {
  useEffect(() => {
    // Initialize Supabase service on app startup
    const initializeService = async () => {
      try {
        await createServiceRoleClient().initialize()
      } catch (error) {
        console.error('Failed to initialize Supabase service:', error)
      }
    }

    initializeService()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show dev tools only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  )
}

export default QueryProvider