'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function UserInfo() {
  const [user, setUser] = useState(null)
  const router = useRouter()
  
  useEffect(() => {
    // Get user session from localStorage
    const sessionData = localStorage.getItem('user_session')
    
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData)
        setUser(session.user)
      } catch (err) {
        console.error('Could not parse user session:', err)
      }
    }
    
    // Check for email in cookie as fallback
    if (!user) {
      const cookies = document.cookie.split(';')
      const emailCookie = cookies.find(c => c.trim().startsWith('user_email='))
      if (emailCookie) {
        const email = emailCookie.split('=')[1]
        setUser({ email, provider: 'cookie' })
      }
    }
  }, [])
  
  const handleSignOut = () => {
    // Clear all auth data
    localStorage.removeItem('user_session')
    localStorage.removeItem('dev_bypass')
    localStorage.removeItem('dev_session')
    
    // Clear cookies
    document.cookie = 'user_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'dev_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    
    // Redirect to login
    router.push('/login-final')
  }
  
  if (!user) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">Not signed in</div>
          <button
            onClick={() => router.push('/login-final')}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Current User</h3>
        <span className="text-xs px-2 py-1 bg-green-900 text-green-300 rounded">
          {user.provider || 'OAuth'}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        {user.avatar && (
          <img 
            src={user.avatar} 
            alt={user.name || user.email}
            className="w-10 h-10 rounded-full"
          />
        )}
        <div className="flex-1">
          {user.name && (
            <div className="text-white font-medium">{user.name}</div>
          )}
          <div className="text-sm text-gray-400">{user.email}</div>
        </div>
      </div>
      
      <button
        onClick={handleSignOut}
        className="mt-4 w-full text-sm px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      >
        Sign Out
      </button>
    </div>
  )
}