// ✅ OPTIMIZED: App Router with Server Components
// app/layout.js - Minimal client-side JavaScript
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

// app/dashboard/page.js - Server Component with heavy APIs
import { google } from 'googleapis' // Server-only, 0KB client impact

export default async function DashboardPage() {
  // Heavy server-side data fetching
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
// app/(dashboard)/analytics/page.js - Charts loaded only here
import dynamic from 'next/dynamic'

const AnalyticsCharts = dynamic(() => import('@/components/AnalyticsCharts'), {
  loading: () => <ChartSkeleton />,
})

// app/(auth)/login/page.js - Auth components loaded only here  
const AuthForm = dynamic(() => import('@/components/AuthForm'), {
  loading: () => <AuthSkeleton />,
})

// ✅ OPTIMIZED: Server Actions for client-server communication
// app/actions.js
'use server'
import { google } from 'googleapis'
import jwt from 'jsonwebtoken'

export async function updateAnalyticsSettings(formData) {
  // Server-side Google API call
  const auth = new google.auth.GoogleAuth({ /* config */ })
  const result = await analytics.management.accounts.list({ auth })
  
  // Only return serializable data
  return { success: true, accounts: result.data.items }
}

// Client component using Server Action
'use client'
import { updateAnalyticsSettings } from '@/app/actions'

export function SettingsForm() {
  async function handleSubmit(formData) {
    // Server Action call - no client-side googleapis needed
    const result = await updateAnalyticsSettings(formData)
    console.log(result)
  }
  
  return <form action={handleSubmit}>/* form */</form>
}