'use client'

import { RefreshCw, ShoppingCart, Package, Store, TrendingUp, DollarSign, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { LocalInventoryManager } from '@/components/inventory/LocalInventoryManager'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function InventoryPage() {
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

      if (response.ok) {
        // Determine inventory scope based on subscription type
        let contextId = null
        
        if (data.subscription_type === 'individual') {
          // Individual subscriber - personal inventory
          contextId = data.user_id
        } else if (data.subscription_type === 'barbershop') {
          // Barbershop subscription - shared shop inventory
          contextId = data.barbershop_id
        } else if (data.subscription_type === 'enterprise') {
          // Enterprise subscription - multi-location access
          contextId = data.current_location_id || data.barbershop_id
        }

        if (contextId) {
          setBarbershopId(contextId)
        } else {
          throw new Error('Unable to determine inventory access')
        }
      } else {
        throw new Error(data.error || 'Failed to load user context')
      }
    } catch (err) {
      console.error('Error loading user context:', err)
      setError(err instanceof Error ? err.message : 'Failed to load inventory system')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Inventory & Marketplace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Inventory System Error</CardTitle>
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
              Your account needs to be properly configured before accessing the inventory system.
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              Inventory & Marketplace
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your shop inventory and order wholesale products from CIN7
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Card className="p-3">
              <div className="flex items-center gap-2 text-sm">
                <Store className="h-4 w-4 text-blue-600" />
                <span>Connected to CIN7</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900">Smart Reordering</h3>
                  <p className="text-sm text-blue-700">Auto-reorder when stock runs low</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">Wholesale Pricing</h3>
                  <p className="text-sm text-green-700">Save 10-25% on product costs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-purple-900">Real-time Sync</h3>
                  <p className="text-sm text-purple-700">Live inventory updates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Local Inventory
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Orders & History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          <LocalInventoryManager barbershopId={barbershopId} />
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-6">
          <MarketplaceBrowser barbershopId={barbershopId} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <OrdersHistory barbershopId={barbershopId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Marketplace Browser Component
function MarketplaceBrowser({ barbershopId }: { barbershopId: string }) {
  const [enrolled, setEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkEnrollment()
  }, [barbershopId])

  const checkEnrollment = async () => {
    try {
      const response = await fetch(`/api/marketplace/enrollment?barbershop_id=${barbershopId}`)
      const data = await response.json()
      setEnrolled(data.enrolled || false)
    } catch (error) {
      console.error('Error checking enrollment:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!enrolled) {
    return (
      <Card className="text-center p-8">
        <CardHeader>
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Store className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Join the BookedBarber Marketplace</CardTitle>
          <CardDescription className="text-lg mt-2">
            Access wholesale products from CIN7 with tiered pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-green-700 mb-2">Silver Tier</h3>
              <p className="text-2xl font-bold text-green-600 mb-2">5% Off</p>
              <p className="text-sm text-muted-foreground">$5,000 credit limit</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-blue-700 mb-2">Gold Tier</h3>
              <p className="text-2xl font-bold text-blue-600 mb-2">10% Off</p>
              <p className="text-sm text-muted-foreground">$10,000 credit limit</p>
            </div>
          </div>
          <Button size="lg" className="w-full max-w-sm">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Enroll in Marketplace
          </Button>
          <p className="text-sm text-muted-foreground">
            NET 30 payment terms • Free shipping on orders over $500
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Wholesale Product Catalog</CardTitle>
          <CardDescription>
            Browse and order products from CIN7 with your discounted pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Marketplace browser interface will be loaded here...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Orders History Component
function OrdersHistory({ barbershopId }: { barbershopId: string }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>
            Track your wholesale orders and delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Order history interface will be loaded here...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}