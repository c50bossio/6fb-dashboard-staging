import './globals.css'
import dynamic from 'next/dynamic'
import ErrorBoundary from '../components/ErrorBoundary'
// Simply import statically - dynamic imports are causing too many issues
import { SupabaseAuthProvider } from '../components/SupabaseAuthProvider'
import { TenantProvider } from '../contexts/TenantContext'
import { ToastProvider } from '../components/ToastContainer'
import { AccessibilityProvider, SkipToContent } from '../components/ui/AccessibilityProvider'

// Dynamically import PostHog provider to avoid SSR issues
const PostHogProvider = dynamic(
  () => import('../components/analytics/PostHogProvider'),
  { ssr: false }
)

// Performance monitoring component
const PerformanceMonitor = dynamic(
  () => import('../components/PerformanceMonitor'),
  { ssr: false }
)

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
      <head>
        {/* Turnstile script moved to only pages that need CAPTCHA */}
      </head>
      <body className="bg-gray-50 antialiased">
        <SkipToContent />
        <ErrorBoundary>
          <AccessibilityProvider>
            <ToastProvider>
              <SupabaseAuthProvider>
                <TenantProvider>
                  <PostHogProvider>
                    <PerformanceMonitor />
                    <main id="main-content">
                      {children}
                    </main>
                  </PostHogProvider>
                </TenantProvider>
              </SupabaseAuthProvider>
            </ToastProvider>
          </AccessibilityProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}