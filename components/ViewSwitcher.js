'use client'

import { useState, useEffect, Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { 
  ChevronDownIcon,
  UserCircleIcon,
  BuildingStorefrontIcon,
  ArrowPathIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useAuth } from './SupabaseAuthProvider'

export default function ViewSwitcher() {
  const { user, profile } = useAuth()
  const [activeContext, setActiveContext] = useState(null)
  const [availableContexts, setAvailableContexts] = useState([])
  const [loading, setLoading] = useState(false)

  const userRole = profile?.role || user?.user_metadata?.role || 'CLIENT'

  useEffect(() => {
    if (userRole) {
      loadAvailableContexts()
    }
  }, [userRole])

  const loadAvailableContexts = async () => {
    try {
      const contexts = []
      
      if (userRole === 'SHOP_OWNER') {
        const response = await fetch('/api/shop/barbers')
        
        if (response.ok) {
          const { barbers } = await response.json()
          
          if (barbers && barbers.length > 0) {
            barbers.forEach(barber => {
              if (barber.users) {
                contexts.push({
                  id: barber.user_id || barber.id,
                  type: 'barber',
                  name: barber.users.full_name || barber.users.email || 'Unnamed Barber',
                  role: 'Barber',
                  email: barber.users.email,
                  avatar: barber.users.avatar_url
                })
              }
            })
          }
        } else {
          console.error('Failed to fetch barbers:', response.status)
        }
      } else if (userRole === 'ENTERPRISE_OWNER') {
        const response = await fetch('/api/enterprise/shops')
        
        if (response.ok) {
          const { shops } = await response.json()
          
          if (shops && shops.length > 0) {
            shops.forEach(shop => {
              contexts.push({
                id: shop.id,
                type: 'shop',
                name: shop.name,
                role: 'Shop',
                location: shop.location
              })
            })
          }
        } else {
          console.error('Failed to fetch shops:', response.status)
        }
      }
      
      setAvailableContexts(contexts)
    } catch (error) {
      console.error('Error loading contexts:', error)
      setAvailableContexts([])
    }
  }

  const switchContext = async (context) => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/auth/switch-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contextType: context === 'primary' ? 'primary' : context.type,
          contextId: context === 'primary' ? null : context.id
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Context switch result:', result)
        
        if (context === 'primary') {
          setActiveContext(null)
          localStorage.removeItem('activeContext')
        } else {
          setActiveContext(context)
          localStorage.setItem('activeContext', JSON.stringify(context))
        }
        
        console.log('Switched context to:', context === 'primary' ? 'Primary View' : context.name)
        
      } else {
        console.error('Failed to switch context:', response.status)
        const error = await response.json()
        console.error('Error details:', error)
      }
    } catch (error) {
      console.error('Failed to switch context:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const savedContext = localStorage.getItem('activeContext')
    if (savedContext) {
      try {
        setActiveContext(JSON.parse(savedContext))
      } catch (e) {
        console.error('Failed to parse saved context:', e)
      }
    }
  }, [])

  if (!user || userRole === 'CLIENT' || userRole === 'BARBER') {
    return null
  }

  if (availableContexts.length === 0) {
    return null
  }

  const getUserDisplayName = () => {
    if (activeContext) {
      return `Viewing as: ${activeContext.name}`
    }
    return user?.name || user?.email || 'My Account'
  }

  const getRoleDisplay = () => {
    if (activeContext) {
      return activeContext.role
    }
    
    const roleMap = {
      'SHOP_OWNER': 'Shop Owner',
      'ENTERPRISE_OWNER': 'Enterprise Owner',
      'SUPER_ADMIN': 'Admin'
    }
    
    return roleMap[userRole] || userRole
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <UserCircleIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
              <p className="text-xs text-gray-500">{getRoleDisplay()}</p>
            </div>
          </div>
          <ChevronDownIcon className="ml-2 -mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {/* Primary Dashboard Option */}
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => switchContext('primary')}
                  disabled={loading || !activeContext}
                  className={`
                    ${active ? 'bg-gray-100' : ''}
                    ${!activeContext ? 'opacity-50' : ''}
                    group flex w-full items-center px-4 py-2 text-sm text-gray-700
                    disabled:cursor-not-allowed
                  `}
                >
                  <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">My Dashboard</p>
                    <p className="text-xs text-gray-500">Return to your primary view</p>
                  </div>
                  {!activeContext && (
                    <CheckIcon className="ml-2 h-4 w-4 text-green-500" />
                  )}
                </button>
              )}
            </Menu.Item>

            {/* Divider */}
            <div className="my-1 h-px bg-gray-200" />

            {/* Shop/Barber Contexts */}
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Switch View To
              </p>
            </div>

            {availableContexts.map((context) => (
              <Menu.Item key={context.id}>
                {({ active }) => (
                  <button
                    onClick={() => switchContext(context)}
                    disabled={loading || activeContext?.id === context.id}
                    className={`
                      ${active ? 'bg-gray-100' : ''}
                      ${activeContext?.id === context.id ? 'opacity-50' : ''}
                      group flex w-full items-center px-4 py-2 text-sm text-gray-700
                      disabled:cursor-not-allowed
                    `}
                  >
                    {context.type === 'shop' ? (
                      <BuildingStorefrontIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                    ) : (
                      <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium">{context.name}</p>
                      <p className="text-xs text-gray-500">View as {context.role}</p>
                    </div>
                    {activeContext?.id === context.id && (
                      <CheckIcon className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}

            {/* Loading State */}
            {loading && (
              <div className="px-4 py-2 flex items-center justify-center">
                <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Switching view...</span>
              </div>
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}