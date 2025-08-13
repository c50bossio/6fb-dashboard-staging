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
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3C4A3E',
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 antialiased">
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  )
}