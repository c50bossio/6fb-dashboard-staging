'use client'

import { RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { POSInterface } from '@/components/pos/POSInterface'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function POSPage() {
  const { user, profile } = useAuth()
  const [barbershopId, setBarbershopId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadUserContext()
    }
  }, [user])

  const loadUserContext = async () => {
    try {
      setLoading(true)
      
      // Get user's subscription-based context
      const response = await fetch('/api/profile/current')
      const data = await response.json()

      if (response.ok && data.profile) {
        // Use the resolved barbershop ID from the API response
        // This handles both individual barbers and shop employees
        const contextId = data.profile.resolved_barbershop_id || 
                         data.profile.barbershop_id || 
                         data.profile.shop_id ||
                         data.profile.id // Fallback to user ID for individual barbers

        if (contextId) {
          setBarbershopId(contextId)
        } else {
          throw new Error('Unable to determine inventory access. Please complete your profile setup.')
        }
      } else {
        throw new Error(data.error || 'Failed to load user context')
      }
    } catch (err) {
      console.error('Error loading user context:', err)
      setError(err instanceof Error ? err.message : 'Failed to load POS system')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Point of Sales system...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">POS System Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={loadUserContext}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!barbershopId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your account needs to be properly configured before accessing the POS system.
            </p>
            <a 
              href="/onboarding" 
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Complete Setup
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Point of Sales</h1>
        <p className="text-muted-foreground">
          Customer checkout and payment processing
        </p>
      </div>

      {/* POS Interface */}
      <POSInterface 
        barbershopId={barbershopId}
        barberId={user?.id}
        customerId={undefined}
      />
    </div>
  )
}