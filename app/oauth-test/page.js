'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../components/SupabaseAuthProvider'
import { createClient } from '../../lib/supabase/client'

export default function OAuthTestPage() {
  const { user, loading } = useAuth()
  const [sessionData, setSessionData] = useState(null)
  const [urlData, setUrlData] = useState(null)
  const [cookieData, setCookieData] = useState(null)

  useEffect(() => {
    setUrlData({
      hash: window.location.hash,
      search: window.location.search,
      pathname: window.location.pathname
    })
    
    setCookieData(document.cookie)
    
    console.log('📦 localStorage items:')
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      console.log(`  ${key}:`, localStorage.getItem(key))
    }
    
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(c => c.trim().startsWith('sb-auth-token='))
    let cookieValue = null
    
    if (authCookie) {
      cookieValue = authCookie.split('=')[1]
      console.log('🍪 Auth cookie found:', cookieValue.substring(0, 50) + '...')
      
      if (cookieValue && cookieValue.startsWith('base64-')) {
        try {
          const decoded = atob(cookieValue.replace('base64-', ''))
          const sessionObj = JSON.parse(decoded)
          console.log('🔓 Decoded session object keys:', Object.keys(sessionObj))
          console.log('🔓 User email in cookie:', sessionObj.user?.email)
          console.log('🔓 Has access_token:', !!sessionObj.access_token)
        } catch (e) {
          console.error('❌ Failed to decode session:', e)
        }
      }
    }
    
    const supabase = createClient()
    console.log('🔍 Checking Supabase session...')
    
    supabase.auth.getSession().then(({ data, error }) => {
      console.log('🔍 Initial session check result:')
      console.log('  - Session exists:', !!data?.session)
      console.log('  - User email:', data?.session?.user?.email)
      console.log('  - Error:', error)
      setSessionData({ data, error })
      
      if (!data?.session && authCookie && cookieValue && cookieValue.startsWith('base64-')) {
        console.log('🔧 No session detected but cookie exists - attempting manual restoration')
        try {
          const decoded = atob(cookieValue.replace('base64-', ''))
          const sessionObj = JSON.parse(decoded)
          
          supabase.auth.setSession({
            access_token: sessionObj.access_token,
            refresh_token: sessionObj.refresh_token
          }).then((result) => {
            console.log('✅ Manual session set result:', {
              session: !!result.data?.session,
              user: result.data?.session?.user?.email,
              error: result.error
            })
            
            if (result.data?.session) {
              setSessionData({ data: result.data, error: result.error })
            }
          }).catch(e => {
            console.error('❌ Failed to set session manually:', e)
          })
        } catch (e) {
          console.error('❌ Failed to decode session for manual restoration:', e)
        }
      }
    }).catch(e => {
      console.error('❌ Session check failed:', e)
      setSessionData({ data: null, error: e })
    })
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">OAuth Debug Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-bold">Auth Provider State:</h2>
          <p>Loading: {loading.toString()}</p>
          <p>User: {user ? user.email : 'null'}</p>
        </div>
        
        <div className="p-4 bg-olive-100 rounded">
          <h2 className="font-bold">URL Data:</h2>
          <pre>{JSON.stringify(urlData, null, 2)}</pre>
        </div>
        
        <div className="p-4 bg-green-100 rounded">
          <h2 className="font-bold">Session Data:</h2>
          <pre>{JSON.stringify(sessionData, null, 2)}</pre>
        </div>
        
        <div className="p-4 bg-yellow-100 rounded">
          <h2 className="font-bold">Cookies:</h2>
          <p className="text-sm break-all">{cookieData}</p>
        </div>
      </div>
    </div>
  )
}