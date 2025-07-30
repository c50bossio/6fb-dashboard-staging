import './globals.css'
import { ClientLayout } from '@/components/ClientLayout'

export const metadata = {
  title: '6FB AI Agent System',
  description: 'AI-powered barbershop business optimization',
}

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 py-3">
                <h1 className="text-xl font-bold text-gray-900">6FB AI Agent System</h1>
              </div>
            </header>
            <main>{children}</main>
          </div>
        </ClientLayout>
      </body>
    </html>
  )
}