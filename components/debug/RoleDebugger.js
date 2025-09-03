'use client'

import { useBusinessContext } from '@/hooks/useBusinessContext'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { Card } from "@/components/ui/card"
import Button from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function RoleDebugger() {
  const router = useRouter()
  const [supabaseStatus, setSupabaseStatus] = useState('checking')
  
  // Get auth context
  const { 
    user: authUser, 
    profile: authProfile, 
    loading: authLoading,
    supabase
  } = useAuth()
  
  // Get business context  
  let { 
    businessContext, 
    user, 
    profile, 
    shopContext,
    role, 
    permissions, 
    canManageStaff, 
    canManageShop,
    isOwner,
    isStaff,
    isLoading,
    refresh
  } = useBusinessContext()
  
  // Note: Emergency override removed - now using API endpoint solution

  // Test Supabase connection
  useEffect(() => {
    const testConnection = async () => {
      if (!supabase) {
        setSupabaseStatus('no-client')
        return
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('count')
          .limit(1)
        
        if (error) {
          setSupabaseStatus(`error: ${error.message}`)
        } else {
          setSupabaseStatus('connected')
        }
      } catch (err) {
        setSupabaseStatus(`connection failed: ${err.message}`)
      }
    }
    
    testConnection()
  }, [supabase])

  const handleLogin = () => {
    router.push('/login')
  }
  
  if (authLoading || isLoading) {
    return (
      <Card className="p-4 mb-4 bg-yellow-50 border-yellow-200">
        <h3 className="font-semibold text-yellow-800">🔍 Role Debug - Loading...</h3>
      </Card>
    )
  }

  // Check if user is not authenticated
  if (!authUser) {
    return (
      <Card className="p-4 mb-4 bg-red-50 border-red-200">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-red-800">🚨 Authentication Issue</h3>
          <Button 
            size="sm" 
            onClick={handleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Go to Login
          </Button>
        </div>
        <p className="text-red-700 text-sm">
          <strong>Problem:</strong> You are not logged in. This is why no user data is loading.
        </p>
        <p className="text-red-600 text-sm mt-2">
          Click "Go to Login" to authenticate, then return to this page.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-blue-800">🔍 Role & Permission Debug</h3>
        <Button 
          size="sm" 
          variant="outline"
          onClick={refresh}
          className="text-xs"
        >
          Refresh Data
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {/* Authentication Status */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Authentication Status:</h4>
          <div className="space-y-1">
            <div><strong>Supabase:</strong> <span className={`font-mono px-1 rounded ${supabaseStatus === 'connected' ? 'bg-green-100 text-green-800' : supabaseStatus === 'checking' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{supabaseStatus === 'connected' ? '✅ Connected' : supabaseStatus === 'checking' ? '⏳ Checking...' : `❌ ${supabaseStatus}`}</span></div>
            <div><strong>Auth User:</strong> <span className={`font-mono px-1 rounded ${authUser ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{authUser ? '✅ Logged In' : '❌ Not Logged In'}</span></div>
            <div><strong>Auth Email:</strong> {authUser?.email || 'Not available'}</div>
            <div><strong>Auth User ID:</strong> {authUser?.id || 'Not available'}</div>
            <div><strong>Business Context User:</strong> <span className={`font-mono px-1 rounded ${user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user ? '✅ Loaded' : '❌ Not Loaded'}</span></div>
          </div>
        </div>

        {/* User Info */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Profile Data:</h4>
          <div className="space-y-1">
            <div><strong>Profile Role:</strong> <span className="font-mono bg-gray-100 px-1 rounded">{profile?.role || 'undefined'}</span></div>
            <div><strong>Computed Role:</strong> <span className="font-mono bg-gray-100 px-1 rounded">{role || 'undefined'}</span></div>
            <div><strong>Full Name:</strong> {profile?.full_name || 'Not set'}</div>
            <div><strong>Profile Loaded:</strong> <span className={`font-mono px-1 rounded ${profile ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{profile ? '✅ Yes' : '❌ No'}</span></div>
          </div>
        </div>

        {/* Permissions */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Permissions:</h4>
          <div className="space-y-1">
            <div><strong>Permissions Array:</strong> <span className="font-mono bg-gray-100 px-1 rounded">[{permissions?.join(', ') || 'none'}]</span></div>
            <div><strong>canManageStaff:</strong> <span className={`font-mono px-1 rounded ${canManageStaff ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{String(canManageStaff)}</span></div>
            <div><strong>canManageShop:</strong> <span className={`font-mono px-1 rounded ${canManageShop ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{String(canManageShop)}</span></div>
            <div><strong>isOwner:</strong> <span className={`font-mono px-1 rounded ${isOwner ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{String(isOwner)}</span></div>
            <div><strong>isStaff:</strong> <span className={`font-mono px-1 rounded ${isStaff ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{String(isStaff)}</span></div>
          </div>
        </div>

        {/* Shop Context */}
        <div className="md:col-span-2">
          <h4 className="font-medium text-gray-700 mb-2">Shop Context:</h4>
          <div className="space-y-1">
            <div><strong>Shop ID:</strong> {shopContext?.barbershopId || 'Not found'}</div>
            <div><strong>Shop Name:</strong> {shopContext?.shop?.name || 'Not loaded'}</div>
            <div><strong>Shop Owner ID:</strong> {shopContext?.shop?.owner_id || 'Not loaded'}</div>
            <div><strong>Is Shop Owner:</strong> <span className={`font-mono px-1 rounded ${shopContext?.isOwner ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{String(shopContext?.isOwner || false)}</span></div>
          </div>
        </div>

        {/* Raw Data for Advanced Debugging */}
        <div className="md:col-span-2 mt-4 pt-4 border-t border-blue-200">
          <details>
            <summary className="font-medium text-gray-700 cursor-pointer">Raw Data (Click to expand)</summary>
            <div className="mt-2 space-y-2 text-xs">
              <div>
                <strong>Profile Object:</strong>
                <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(profile, null, 2)}</pre>
              </div>
              <div>
                <strong>Shop Context Object:</strong>
                <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(shopContext, null, 2)}</pre>
              </div>
            </div>
          </details>
        </div>
      </div>
    </Card>
  )
}