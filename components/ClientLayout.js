'use client'

import { AuthProvider } from '@/components/AuthProvider'

// ✅ OPTIMIZED: Isolated Client Layout Component
// - Only AuthProvider requires client-side rendering
// - Minimal client bundle impact
// - Server components remain server-rendered
export function ClientLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}