'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, BarChart3, Package, Store } from 'lucide-react'

import { POSInterface } from '@/components/pos/POSInterface'
import { POSDashboard } from '@/components/pos/POSDashboard'
import { InventoryManager } from '@/components/pos/InventoryManager'

// Mock data - replace with actual data from context/props
const MOCK_BARBERSHOP_ID = "550e8400-e29b-41d4-a716-446655440000"
const MOCK_BARBER_ID = "550e8400-e29b-41d4-a716-446655440001"

export default function POSPage() {
  const [activeTab, setActiveTab] = useState("pos")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Store className="h-6 w-6" />
                Point of Sale System
              </h1>
              <p className="text-muted-foreground">
                Manage product sales, inventory, and analytics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Demo Mode</Badge>
              <Badge variant="secondary">Barbershop A</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 mt-6">
            <TabsTrigger value="pos" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Point of Sale
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Point of Sale Interface</CardTitle>
                <p className="text-muted-foreground">
                  Process product sales and manage transactions
                </p>
              </CardHeader>
            </Card>
            <POSInterface 
              barbershopId={MOCK_BARBERSHOP_ID}
              barberId={MOCK_BARBER_ID}
            />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <InventoryManager barbershopId={MOCK_BARBERSHOP_ID} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <POSDashboard barbershopId={MOCK_BARBERSHOP_ID} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Actions Footer */}
      <div className="fixed bottom-6 right-6 space-y-2">
        {activeTab === 'pos' && (
          <Card className="p-4 shadow-lg">
            <div className="text-sm font-medium mb-2">Quick Actions</div>
            <div className="space-y-2">
              <div className="text-sm">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">F1</kbd> New Sale
              </div>
              <div className="text-sm">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">F2</kbd> Search Products
              </div>
              <div className="text-sm">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">F3</kbd> Process Payment
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}