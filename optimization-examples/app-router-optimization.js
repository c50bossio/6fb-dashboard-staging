// ✅ OPTIMIZED: App Router with Server Components
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {/* Server Component - no JS to client */}
        <ServerHeader />
        
        {/* Route-specific bundles loaded on demand */}
        <main>{children}</main>
        
        {/* Only essential client components */}
        <ClientThemeProvider />
      </body>
    </html>
  )
}

import { google } from 'googleapis' // Server-only, 0KB client impact

export default async function DashboardPage() {
  const analyticsData = await fetchGoogleAnalytics()
  const dbStats = await fetchDatabaseStats()
  
  return (
    <div className="dashboard">
      {/* Server-rendered data */}
      <ServerAnalyticsWidget data={analyticsData} />
      
      {/* Client component only when interactivity needed */}
      <InteractiveChart data={dbStats} />
    </div>
  )
}

// ✅ OPTIMIZED: Route Groups for bundle splitting
import dynamic from 'next/dynamic'

const AnalyticsCharts = dynamic(() => import('@/components/AnalyticsCharts'), {
  loading: () => <ChartSkeleton />,
})

const AuthForm = dynamic(() => import('@/components/AuthForm'), {
  loading: () => <AuthSkeleton />,
})

// ✅ OPTIMIZED: Server Actions for client-server communication
'use server'
import { google } from 'googleapis'
import jwt from 'jsonwebtoken'

export async function updateAnalyticsSettings(formData) {
  const auth = new google.auth.GoogleAuth({ /* config */ })
  const result = await analytics.management.accounts.list({ auth })
  
  return { success: true, accounts: result.data.items }
}

'use client'
import { updateAnalyticsSettings } from '@/app/actions'

export function SettingsForm() {
  async function handleSubmit(formData) {
    const result = await updateAnalyticsSettings(formData)
    console.log(result)
  }
  
  return <form action={handleSubmit}>/* form */</form>
}