'use client';

import { 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { LocalInventoryManager } from '../../../components/inventory/LocalInventoryManager';
import { MarketplaceBrowser } from '../../../components/marketplace/MarketplaceBrowser';
import { useAuth } from '../../../components/SupabaseAuthProvider';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs.jsx';
import { useToast } from '../../../hooks/use-toast';

export default function InventoryPage() {
  const { user, profile } = useAuth();
  const [barbershopId, setBarbershopId] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadBarbershopAndEnrollment();
    }
  }, [user]);

  const loadBarbershopAndEnrollment = async () => {
    try {
      // Get user's barbershop
      const profileResponse = await fetch('/api/profile');
      const profileData = await profileResponse.json();
      
      if (profileData.barbershop_id) {
        setBarbershopId(profileData.barbershop_id);
        
        // Check marketplace enrollment
        const enrollmentResponse = await fetch(`/api/marketplace/enroll?barbershop_id=${profileData.barbershop_id}`);
        const enrollmentData = await enrollmentResponse.json();
        setEnrollmentStatus(enrollmentData);
      } else {
        toast({
          title: "No Barbershop Found",
          description: "Please complete your barbershop setup first.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load barbershop information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollment = async () => {
    try {
      // First get fresh barbershop data
      const profileResponse = await fetch('/api/profile');
      const profileData = await profileResponse.json();
      const barbershop = profileData.barbershop || {};
      
      const response = await fetch('/api/marketplace/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          company_name: barbershop.name || 'My Barbershop',
          shipping_address: {
            street: barbershop.address || '',
            city: barbershop.city || '',
            state: barbershop.state || '',
            zip: barbershop.zip || '',
            country: 'US'
          },
          order_notification_email: user?.email || profile?.email,
          marketing_opt_in: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Enrollment Successful",
          description: "Welcome to BookedBarber Marketplace! Your account is pending approval.",
        });
        setEnrollmentStatus({ ...data.enrollment, enrolled: true });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Enrollment Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!barbershopId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Barbershop Setup Required</CardTitle>
            <CardDescription>
              You need to set up your barbershop profile before managing inventory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/onboarding'}>
              Complete Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground mt-1">
              Track your products and order from BookedBarber wholesale
            </p>
          </div>
          <div className="flex items-center gap-2">
            {enrollmentStatus?.enrolled ? (
              <Badge variant={
                enrollmentStatus.enrollment?.enrollment_status === 'active' ? 'default' : 'secondary'
              }>
                {enrollmentStatus.enrollment?.enrollment_status === 'active' 
                  ? 'Marketplace Active' 
                  : 'Enrollment Pending'}
              </Badge>
            ) : (
              <Button onClick={handleEnrollment} variant="outline">
                Join Marketplace
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {enrollmentStatus?.enrolled && enrollmentStatus.enrollment?.enrollment_status === 'active' && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Marketplace Status</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {enrollmentStatus.enrollment?.discount_tier || 'Standard'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Member tier
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Credit</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${enrollmentStatus.enrollment?.available_credit?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Credit limit: ${enrollmentStatus.enrollment?.credit_limit?.toFixed(2) || '0.00'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {enrollmentStatus.enrollment?.statistics?.total_orders || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {enrollmentStatus.enrollment?.statistics?.pending_orders || 0} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${enrollmentStatus.enrollment?.statistics?.total_spent?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lifetime value
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            My Inventory
          </TabsTrigger>
          <TabsTrigger 
            value="marketplace" 
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Browse Wholesale
          </TabsTrigger>
          <TabsTrigger 
            value="orders" 
            className="flex items-center gap-2"
            disabled={!enrollmentStatus?.enrolled}
          >
            <BarChart3 className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <LocalInventoryManager barbershopId={barbershopId} />
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-4">
          {/* Subscription Tier Banner */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">
                    {['enterprise', 'ENTERPRISE'].includes(enrollmentStatus?.enrollment?.subscription_tier) 
                      ? '🏆 Enterprise Wholesale Access' 
                      : ['premium', 'PROFESSIONAL'].includes(enrollmentStatus?.enrollment?.subscription_tier)
                      ? '⭐ Premium Wholesale Access'
                      : '🛒 Free Wholesale Access'}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {['enterprise', 'ENTERPRISE'].includes(enrollmentStatus?.enrollment?.subscription_tier) 
                      ? 'You save 15% on all wholesale products + exclusive items' 
                      : ['premium', 'PROFESSIONAL'].includes(enrollmentStatus?.enrollment?.subscription_tier)
                      ? 'You save 5% on all wholesale products'
                      : 'Browse our wholesale catalog - upgrade for discounts!'}
                  </p>
                </div>
                {(!enrollmentStatus?.enrollment?.subscription_tier || ['free', 'FREE'].includes(enrollmentStatus?.enrollment?.subscription_tier)) && (
                  <Button variant="outline" className="bg-white">
                    Upgrade & Save
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Universal Marketplace Access */}
          <MarketplaceBrowser barbershopId={barbershopId} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>
                View and manage your marketplace orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Order management interface coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Settings</CardTitle>
              <CardDescription>
                Configure your inventory and marketplace preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Marketplace Enrollment</h4>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      Status: {enrollmentStatus?.enrolled ? 'Enrolled' : 'Not Enrolled'}
                    </p>
                    {enrollmentStatus?.enrolled && (
                      <p className="text-sm text-muted-foreground">
                        Account: {enrollmentStatus.enrollment?.account_number}
                      </p>
                    )}
                  </div>
                  {!enrollmentStatus?.enrolled && (
                    <Button onClick={handleEnrollment}>
                      Enroll Now
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Reorder Settings</h4>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Configure automatic reordering thresholds and preferences
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Notification Preferences</h4>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Set up alerts for low stock and order updates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}