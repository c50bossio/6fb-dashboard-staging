'use client'

import { RefreshCw, ShoppingCart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { POSInterface } from '@/components/pos/POSInterface'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function POSPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [barbershopId, setbarbershopId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Wait for auth to finish loading before processing profile
    if (authLoading) {
      return
    }

    if (user && profile) {
      loadUserContext()
    } else if (!user) {
      // No user means not authenticated - let middleware handle redirect
      setLoading(false)
    }
  }, [user, profile, authLoading])

  const loadUserContext = async () => {
    try {
      setLoading(true)

      // Use profile data directly from useAuth() - no HTTP request needed
      // This eliminates 401 errors and improves page load performance
      const contextId = profile?.barbershop_id ||  // Primary barbershop association
                       profile?.barbershop_id ||   // Fallback field name
                       user?.id                     // Individual barber fallback

      if (contextId) {
        setbarbershopId(contextId)
        console.log('✅ POS: Loaded barbershop context:', contextId)
      } else {
        throw new Error('Unable to determine inventory access. Please complete your profile setup.')
      }
    } catch (err) {
      console.error('❌ POS: Error loading user context:', err)
      setError(err instanceof Error ? err.message : 'Failed to load POS system')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Loading Point of Sale...</p>
          <p className="text-sm text-muted-foreground mt-2">Preparing your checkout system</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto card-modern-gold shadow-gold">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              POS System Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={loadUserContext}
              className="btn-primary"
            >
              Retry Connection
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!barbershopId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto card-modern-gold shadow-gold">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your account needs to be properly configured before accessing the POS system.
            </p>
            <a
              href="/onboarding"
              className="btn-primary inline-block"
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
      {/* Header with Brand Styling */}
      <div className="mb-6 p-6 rounded-2xl gradient-gold-subtle border border-brand-600/20 dark:border-brand-700/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Point of Sale</h1>
        </div>
        <p className="text-muted-foreground ml-13">
          Professional checkout and payment processing
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