'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  DollarSign,
  AlertTriangle,
  BarChart3,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DashboardStats {
  dailySales: {
    revenue: number
    transactions: number
    unitsSold: number
  }
  topProducts: Array<{
    product_id: string
    product_name: string
    units_sold: number
    total_revenue: number
    sales_velocity: number
  }>
  lowStockItems: Array<{
    id: string
    name: string
    current_stock: number
    reorder_point: number
  }>
  recentSales: Array<{
    id: string
    product_name: string
    quantity: number
    total_amount: number
    sale_date: string
    barber_name?: string
  }>
}

interface POSDashboardProps {
  barbershopId: string
}

export function POSDashboard({ barbershopId }: POSDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(7)
  const { toast } = useToast()

  useEffect(() => {
    loadDashboardData()
  }, [barbershopId, selectedPeriod])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load multiple endpoints in parallel
      const [
        dailySalesRes,
        topProductsRes,
        lowStockRes,
        recentSalesRes
      ] = await Promise.all([
        fetch(`/api/pos/analytics/daily-sales?barbershop_id=${barbershopId}&days=${selectedPeriod}`),
        fetch(`/api/pos/analytics/top-products?barbershop_id=${barbershopId}&days=${selectedPeriod}&limit=5`),
        fetch(`/api/pos/products?barbershop_id=${barbershopId}&low_stock=true`),
        fetch(`/api/pos/sales?barbershop_id=${barbershopId}&limit=10`)
      ])

      const [dailySales, topProducts, lowStock, recentSales] = await Promise.all([
        dailySalesRes.json(),
        topProductsRes.json(),
        lowStockRes.json(),
        recentSalesRes.json()
      ])

      // Calculate totals for the period
      const totalRevenue = dailySales.reduce((sum: number, day: any) => sum + day.revenue, 0)
      const totalTransactions = dailySales.reduce((sum: number, day: any) => sum + day.transactions, 0)
      const totalUnits = dailySales.reduce((sum: number, day: any) => sum + day.units_sold, 0)

      setStats({
        dailySales: {
          revenue: totalRevenue,
          transactions: totalTransactions,
          unitsSold: totalUnits
        },
        topProducts,
        lowStockItems: lowStock.filter((item: any) => item.current_stock <= item.reorder_point),
        recentSales
      })

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">No data available</p>
          <Button onClick={loadDashboardData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">POS Dashboard</h2>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value) as 7 | 30 | 90)}
            className="px-3 py-2 border rounded-md"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.dailySales.revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Last {selectedPeriod} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dailySales.transactions}</div>
            <p className="text-xs text-muted-foreground">
              Total sales processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dailySales.unitsSold}</div>
            <p className="text-xs text-muted-foreground">
              Products moved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert ({stats.lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.lowStockItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-md">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.current_stock} left (reorder at {item.reorder_point})
                    </p>
                  </div>
                  <Badge variant="destructive">{item.current_stock}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="top-products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="top-products">Top Products</TabsTrigger>
          <TabsTrigger value="recent-sales">Recent Sales</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="top-products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Selling Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No sales data available for this period
                  </p>
                ) : (
                  stats.topProducts.map((product, index) => (
                    <div key={product.product_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{product.product_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {product.units_sold} units • {product.sales_velocity.toFixed(1)}/day velocity
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${product.total_revenue.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent-sales">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentSales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No recent sales
                  </p>
                ) : (
                  stats.recentSales.map(sale => (
                    <div key={sale.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">{sale.product_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Qty: {sale.quantity} • {sale.barber_name || 'Unknown barber'} • 
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        ${sale.total_amount.toFixed(2)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Sales Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        ${(stats.dailySales.revenue / stats.dailySales.transactions || 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">Avg Transaction</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {(stats.dailySales.unitsSold / stats.dailySales.transactions || 0).toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground">Items per Sale</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      ${(stats.dailySales.revenue / selectedPeriod).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Daily Average Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Low Stock Items</span>
                    <Badge variant={stats.lowStockItems.length > 0 ? "destructive" : "default"}>
                      {stats.lowStockItems.length}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Sales Velocity</span>
                    <span className="font-medium">
                      {(stats.dailySales.unitsSold / selectedPeriod).toFixed(1)} units/day
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Products</span>
                    <span className="font-medium">{stats.topProducts.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}