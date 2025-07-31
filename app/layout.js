import './globals.css'
import Navigation from '../components/Navigation'

export const metadata = {
  title: '6FB AI Agent System - Barbershop Dashboard',
  description: 'AI-powered barbershop management and marketing automation',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 antialiased">
        <div className="flex min-h-screen">
          <Navigation />
          <main className="flex-1 ml-64">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}