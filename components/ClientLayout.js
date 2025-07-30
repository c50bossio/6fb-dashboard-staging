'use client'

import { AuthProvider } from '@/components/AuthProvider'

export function ClientLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}