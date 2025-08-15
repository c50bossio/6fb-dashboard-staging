'use client'

import { useAuth } from './SupabaseAuthProvider'

export default function AuthDebugger() {
  const { user, loading } = useAuth()
  
  const forceReload = () => {
    localStorage.clear()
    sessionStorage.clear()
    
    window.location.reload()
  }
  
  const clearAuthStorage = () => {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || key.includes('supabase')
    )
    keys.forEach(key => localStorage.removeItem(key))
    
    window.location.reload()
  }
  
  if (process.env.NODE_ENV === 'production') return null
  
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-xs">
      <h3 className="font-bold mb-2">Auth Debug Panel</h3>
      <p>User: {user?.email || 'None'}</p>
      <p>Loading: {loading ? '🔴 Yes' : '🟢 No'}</p>
      <div className="mt-2 space-x-2">
        <button 
          onClick={forceReload}
          className="bg-red-600 px-2 py-1 rounded text-xs"
        >
          Force Reload
        </button>
        <button 
          onClick={clearAuthStorage}
          className="bg-orange-600 px-2 py-1 rounded text-xs"
        >
          Clear Auth
        </button>
      </div>
    </div>
  )
}