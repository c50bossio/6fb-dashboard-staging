'use client'

import { useState, useEffect, Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import {
  ChevronDownIcon,
  BuildingStorefrontIcon,
  CheckIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'

export default function ShopSelector() {
  const { user, profile, refreshProfile } = useAuth()
  const [shops, setShops] = useState([])
  const [selectedShop, setSelectedShop] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load user's barbershops
  useEffect(() => {
    if (profile?.organization_id) {
      console.log('🏢 [ShopSelector] Loading shops for organization:', profile.organization_id)
      loadShops()
    } else {
      if (process.env.NODE_ENV === 'development') {
        if (!profile) {
          console.log('⏳ [ShopSelector] Waiting for profile to load...')
        } else {
          console.warn('⚠️ [ShopSelector] Profile loaded but no organization_id found:', {
            profileId: profile.id,
            email: profile.email,
            role: profile.role
          })
        }
      }
      setLoading(false)
    }
  }, [profile?.organization_id])

  // Update selectedShop when profile.last_selected_shop_id changes (without refetching shops)
  // This handles shop switching without a page reload
  useEffect(() => {
    if (profile?.last_selected_shop_id && shops.length > 0) {
      const newSelectedShop = shops.find(shop => shop.id === profile.last_selected_shop_id)
      if (newSelectedShop && newSelectedShop.id !== selectedShop?.id) {
        console.log('🔄 [ShopSelector] last_selected_shop_id changed, updating selectedShop:', newSelectedShop.name)
        setSelectedShop(newSelectedShop)
      }
    }
  }, [profile?.last_selected_shop_id, shops, selectedShop])

  const loadShops = async () => {
    try {
      setLoading(true)

      // Get auth session for API request
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
        const shops = data.shops || []
        setShops(shops)

        console.log('✅ [ShopSelector] Loaded shops:', shops.map(s => ({ id: s.id, name: s.name })))

        // Set the currently selected shop
        // Prioritize last_selected_shop_id (selected shop) over barbershop_id (home shop)
        const currentShop = shops.find(
          shop => shop.id === profile.last_selected_shop_id ||
                  shop.id === profile.barbershop_id
        )
        const selected = currentShop || shops[0]
        setSelectedShop(selected)

        console.log('🎯 [ShopSelector] Selected shop:', selected ? { id: selected.id, name: selected.name } : 'none')
        console.log('🔍 [ShopSelector] Profile IDs:', {
          last_selected_shop_id: profile.last_selected_shop_id,
          barbershop_id: profile.barbershop_id
        })
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ [ShopSelector] Failed to load shops:', response.status, await response.text())
        }
        setShops([])
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ ShopSelector: Error loading shops:', error)
      }
      setShops([])
    } finally {
      setLoading(false)
    }
  }

  const switchShop = async (shop) => {
    try {
      console.log('🔄 [ShopSelector] Switching to shop:', { id: shop.id, name: shop.name })

      // Update last_selected_shop_id in profiles table (this is what TenantContext reads)
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          last_selected_shop_id: shop.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('❌ [ShopSelector] Failed to update profile:', updateError)
        return
      }

      console.log('✅ [ShopSelector] Shop switched successfully in database')

      // Clear tenant resolver cache to force fresh lookup
      console.log('🗑️ [ShopSelector] Clearing tenant cache...')
      try {
        await fetch('/api/tenant/clear-cache', { method: 'POST' })
        console.log('✅ [ShopSelector] Tenant cache cleared')
      } catch (cacheError) {
        console.warn('⚠️ [ShopSelector] Failed to clear cache:', cacheError)
      }

      // Refresh profile cache to get updated shop_id
      console.log('🔄 [ShopSelector] Refreshing profile cache...')
      await refreshProfile()

      setSelectedShop(shop)

      // Reload page to refresh TenantContext with new shop
      console.log('🔄 [ShopSelector] Reloading page...')
      window.location.reload()
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [ShopSelector] Error switching shop:', error)
      }
    }
  }

  // Show single shop info if only one shop (no dropdown needed)
  if (shops.length === 1 && selectedShop) {
    return (
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <BuildingStorefrontIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {selectedShop.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {selectedShop.city}, {selectedShop.state}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Don't show if no shops loaded yet and not loading
  if (shops.length === 0 && !loading) {
    return null
  }

  if (loading) {
    return (
      <div className="px-4 py-3 border-b border-border">
        <div className="animate-pulse flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 border-b border-border">
      <Menu as="div" className="relative">
        <Menu.Button className="w-full flex items-center space-x-3 hover:bg-muted rounded-lg p-2 -m-2 transition-colors">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <BuildingStorefrontIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-foreground truncate">
              {selectedShop?.name || 'Select Shop'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {selectedShop ? `${selectedShop.city}, ${selectedShop.state}` : 'No location'}
            </p>
          </div>
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute left-0 right-0 mt-2 bg-card rounded-lg shadow-lg ring-1 ring-border focus:outline-none z-50 max-h-60 overflow-auto">
            <div className="py-1">
              {shops.map((shop) => (
                <Menu.Item key={shop.id}>
                  {({ active }) => (
                    <button
                      onClick={() => switchShop(shop)}
                      className={`${
                        active ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                      } ${
                        selectedShop?.id === shop.id ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                      } group flex items-center w-full px-4 py-3 text-sm`}
                    >
                      <BuildingStorefrontIcon
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          selectedShop?.id === shop.id
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-medium ${
                          selectedShop?.id === shop.id
                            ? 'text-amber-900 dark:text-amber-100'
                            : 'text-foreground'
                        }`}>
                          {shop.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {shop.city}, {shop.state}
                        </p>
                      </div>
                      {selectedShop?.id === shop.id && (
                        <CheckIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      )}
                    </button>
                  )}
                </Menu.Item>
              ))}

              {/* Add Location Button - Always visible for enterprise/shop owners */}
              <div className="border-t border-border mt-1 pt-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => window.location.href = '/enterprise/website'}
                      className={`${
                        active ? 'bg-olive-50 dark:bg-olive-900/20' : ''
                      } group flex items-center w-full px-4 py-3 text-sm text-olive-700 dark:text-olive-300 hover:text-olive-900 dark:hover:text-olive-100`}
                    >
                      <PlusIcon className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="font-medium">Add Location</span>
                    </button>
                  )}
                </Menu.Item>
              </div>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  )
}
