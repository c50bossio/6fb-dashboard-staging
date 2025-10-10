'use client'

import { useAuth } from '@/components/SupabaseAuthProvider'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DiagnosticPage() {
  const { user, profile, loading } = useAuth()
  const [shops, setShops] = useState([])
  const [error, setError] = useState(null)
  const [shopsLoading, setShopsLoading] = useState(false)

  useEffect(() => {
    const loadShops = async () => {
      if (!profile?.organization_id) {
        setError('Profile does not have organization_id')
        return
      }

      try {
        setShopsLoading(true)
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        const headers = {
          'Content-Type': 'application/json'
        }

        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }

        const response = await fetch(`/api/organizations/${profile.organization_id}/shops`, {
          headers
        })

        if (response.ok) {
          const data = await response.json()
          setShops(data.shops || [])
          setError(null)
        } else {
          const errorText = await response.text()
          setError(`API Error ${response.status}: ${errorText}`)
        }
      } catch (err) {
        setError(`Exception: ${err.message}`)
      } finally {
        setShopsLoading(false)
      }
    }

    if (profile?.organization_id) {
      loadShops()
    }
  }, [profile?.organization_id])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">ShopSelector Diagnostic</h1>
        <p>Loading authentication...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">ShopSelector Diagnostic Tool</h1>

      {/* User Info */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">User Authentication</h2>
        <div className="space-y-2 font-mono text-sm">
          <div><span className="font-bold">Authenticated:</span> {user ? '✅ Yes' : '❌ No'}</div>
          <div><span className="font-bold">User ID:</span> {user?.id || 'N/A'}</div>
          <div><span className="font-bold">Email:</span> {user?.email || 'N/A'}</div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Profile Data</h2>
        <div className="space-y-2 font-mono text-sm">
          <div><span className="font-bold">Profile Loaded:</span> {profile ? '✅ Yes' : '❌ No'}</div>
          <div><span className="font-bold">Profile ID:</span> {profile?.id || 'N/A'}</div>
          <div><span className="font-bold">Role:</span> {profile?.role || 'N/A'}</div>
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
            <span className="font-bold">Organization ID:</span> {profile?.organization_id || '❌ MISSING (THIS IS THE ISSUE!)'}
          </div>
          <div><span className="font-bold">Barbershop ID:</span> {profile?.barbershop_id || 'N/A'}</div>
          <div><span className="font-bold">Last Selected Shop ID:</span> {profile?.last_selected_shop_id || 'N/A'}</div>
        </div>
      </div>

      {/* Shop Loading Status */}
      <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Shop Loading Status</h2>
        <div className="space-y-2 font-mono text-sm">
          <div><span className="font-bold">Shops Loading:</span> {shopsLoading ? '⏳ Yes' : 'No'}</div>
          <div><span className="font-bold">Shops Loaded:</span> {shops.length > 0 ? `✅ ${shops.length} shops` : '❌ No shops'}</div>
          {error && (
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded">
              <span className="font-bold text-red-700 dark:text-red-300">Error:</span> {error}
            </div>
          )}
        </div>
      </div>

      {/* Shops List */}
      {shops.length > 0 && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Available Shops</h2>
          <div className="space-y-2">
            {shops.map((shop, index) => (
              <div key={shop.id} className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <div className="font-bold">{index + 1}. {shop.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{shop.city}, {shop.state}</div>
                <div className="text-xs text-gray-500 dark:text-gray-500 font-mono">ID: {shop.id}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnosis */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Diagnosis</h2>
        <div className="space-y-2 text-sm">
          {!user && <div className="text-red-600 dark:text-red-400">❌ User is not authenticated</div>}
          {user && !profile && <div className="text-red-600 dark:text-red-400">❌ Profile failed to load</div>}
          {profile && !profile.organization_id && (
            <div className="text-red-600 dark:text-red-400 font-bold">
              ❌ MAIN ISSUE: Profile does not have an organization_id. The ShopSelector requires this field to load shops.
            </div>
          )}
          {profile?.organization_id && shops.length === 0 && !shopsLoading && (
            <div className="text-orange-600 dark:text-orange-400">
              ⚠️ Organization ID exists but no shops found. Check API endpoint or database.
            </div>
          )}
          {profile?.organization_id && shops.length > 0 && (
            <div className="text-green-600 dark:text-green-400 font-bold">
              ✅ Everything looks good! ShopSelector should be visible. Check if sidebar is collapsed.
            </div>
          )}
        </div>
      </div>

      {/* Raw JSON */}
      <details className="mt-6">
        <summary className="cursor-pointer font-semibold text-lg mb-2">View Raw JSON Data</summary>
        <div className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-auto">
          <pre className="text-xs">{JSON.stringify({ user, profile, shops, error }, null, 2)}</pre>
        </div>
      </details>
    </div>
  )
}
