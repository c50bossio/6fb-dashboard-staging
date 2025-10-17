import './globals.css'
import ClientWrapper from '../components/ClientWrapper'

export const metadata = {
  title: 'BookedBarber - Professional Barbershop Management',
  description: 'AI-powered barbershop management and marketing automation',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BookedBarber',
  },
  formatDetection: {
    telephone: false,
  },
  // Add modern PWA meta tag to replace deprecated apple-mobile-web-app-capable
  other: {
    'mobile-web-app-capable': 'yes',
  },
  // Removed dynamic cache-bust to prevent hydration mismatch
  // Cache control is handled by Next.js and middleware
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zoom for accessibility (WCAG compliance)
  userScalable: true, // Enable pinch-to-zoom for accessibility
  themeColor: '#3C4A3E',
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content', // Better keyboard/input handling on mobile
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background antialiased">
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  )
}// Force deployment Wed Aug 13 19:54:37 EDT 2025
