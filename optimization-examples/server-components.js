// ❌ CURRENT: Client-side Google APIs (adds ~2MB to bundle)
'use client'
import { google } from 'googleapis'
import { GoogleAuth } from 'google-auth-library'

// ✅ OPTIMIZED: Server Component for Google APIs
import { google } from 'googleapis' // Server-side only - 0KB client impact

export default async function GoogleAnalytics() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly']
  })
  
  const analytics = google.analytics('v3')
  const data = await analytics.data.ga.get({
    ids: 'ga:your-view-id',
    'start-date': '30daysAgo',
    'end-date': 'today',
    metrics: 'ga:sessions,ga:users'
  })

  return (
    <div className="analytics-widget">
      <h3>Analytics Data</h3>
      <p>Sessions: {data.data.rows[0][0]}</p>
      <p>Users: {data.data.rows[0][1]}</p>
    </div>
  )
}

// ✅ OPTIMIZED: Server Actions for API calls
'use server'
export async function fetchGoogleAnalytics() {
  const auth = new google.auth.GoogleAuth({ /* config */ })
  const analytics = google.analytics('v3')
  
  const result = await analytics.data.ga.get({
  })
  
  return result.data // Only send data, not library code
}