import './globals.css'
import ErrorBoundary from '../components/ErrorBoundary'
import { AccessibilityProvider, SkipToContent } from '../components/ui/AccessibilityProvider'
import { SupabaseAuthProvider } from '../components/SupabaseAuthProvider'
import { ToastProvider } from '../components/ToastContainer'

export const metadata = {
  title: '6FB AI Agent System - Barbershop Dashboard',
  description: 'AI-powered barbershop management and marketing automation',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 antialiased">
        <SkipToContent />
        <ErrorBoundary>
          <AccessibilityProvider>
            <ToastProvider>
              <SupabaseAuthProvider>
                {children}
              </SupabaseAuthProvider>
            </ToastProvider>
          </AccessibilityProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}