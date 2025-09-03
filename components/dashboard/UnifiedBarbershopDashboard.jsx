"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSTransactionInterface from '@/components/pos/POSTransactionInterface';
import BookingCalendarInterface from '@/components/booking/BookingCalendarInterface';
import CustomerManagementInterface from '@/components/customers/CustomerManagementInterface';
import { toast } from 'sonner';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  ShoppingCart, 
  TrendingUp,
  Clock,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
  Settings,
  BarChart3,
  Zap
} from 'lucide-react';

// Unified Dashboard for Single Barbershop MVP
export default function UnifiedBarbershopDashboard({ barbershopId, staffId, userProfile }) {
  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState({});
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [barbershopInfo, setBarbershopInfo] = useState(null);

  // Load dashboard data on component mount
  useEffect(() => {
    if (barbershopId && staffId) {
      loadDashboardData();
    }
  }, [barbershopId, staffId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadBarbershopInfo(),
        loadDashboardStats(),
        loadTodayAppointments(),
        loadRecentTransactions()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadBarbershopInfo = async () => {
    try {
      const response = await fetch(`/api/barbershops/${barbershopId}`);
      if (response.ok) {
        const data = await response.json();
        setBarbershopInfo(data.barbershop);
      }
    } catch (error) {
      console.error('Failed to load barbershop info:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/dashboard/stats?barbershop_id=${barbershopId}&date=${today}`);
      if (response.ok) {
        const stats = await response.json();
        setDashboardStats(stats);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  };

  const loadTodayAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/appointments?barbershop_id=${barbershopId}&start_date=${today}&end_date=${today}`);
      if (response.ok) {
        const data = await response.json();
        setTodayAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Failed to load today appointments:', error);
    }
  };

  const loadRecentTransactions = async () => {
    try {
      const response = await fetch(`/api/pos/transactions?barbershop_id=${barbershopId}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setRecentTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to load recent transactions:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'confirmed': 'bg-green-100 text-green-800',
      'completed': 'bg-blue-100 text-blue-800',
      'cancelled': 'bg-red-100 text-red-800',
      'no_show': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {barbershopInfo?.name || 'Dashboard'}
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {userProfile?.full_name || 'User'}! Here's what's happening today.
              </p>
              {barbershopInfo && (
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {barbershopInfo.address}
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {barbershopInfo.phone}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadDashboardData}>
                <Zap className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today's Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboardStats.todayRevenue)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  +{dashboardStats.revenueGrowth || 0}% from yesterday
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today's Appointments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardStats.todayAppointments || 0}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {dashboardStats.completedAppointments || 0} completed
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardStats.totalCustomers || 0}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {dashboardStats.newCustomersToday || 0} new today
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardStats.todayTransactions || 0}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Avg: {formatCurrency(dashboardStats.avgTransactionValue)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pos">POS System</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Schedule */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Today's Schedule</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab('calendar')}
                  >
                    View Calendar
                  </Button>
                </div>

                <div className="space-y-3">
                  {todayAppointments.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No appointments scheduled for today</p>
                    </div>
                  ) : (
                    todayAppointments.slice(0, 5).map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">
                              {formatTime(appointment.scheduled_at)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {appointment.customer?.name || 'Walk-in'} - {appointment.service?.name}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Recent Transactions</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab('pos')}
                  >
                    Open POS
                  </Button>
                </div>

                <div className="space-y-3">
                  {recentTransactions.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No transactions yet today</p>
                    </div>
                  ) : (
                    recentTransactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="font-medium">
                              {formatCurrency(transaction.total_amount)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {transaction.payment_method} • {formatTime(transaction.created_at)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="success">
                          Completed
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Performance Summary */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(dashboardStats.weeklyRevenue)}
                  </p>
                  <p className="text-sm text-gray-600">Weekly Revenue</p>
                  <p className="text-xs text-green-600 mt-1">
                    +{dashboardStats.weeklyGrowth || 0}% from last week
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardStats.completionRate || 0}%
                  </p>
                  <p className="text-sm text-gray-600">Appointment Completion</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {dashboardStats.totalCompletedAppointments || 0} completed this week
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardStats.customerSatisfaction || 0}%
                  </p>
                  <p className="text-sm text-gray-600">Customer Satisfaction</p>
                  <p className="text-xs text-purple-600 mt-1">
                    Based on {dashboardStats.totalReviews || 0} reviews
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* POS System Tab */}
        <TabsContent value="pos">
          <Card>
            <div className="p-6">
              <POSTransactionInterface 
                barbershopId={barbershopId}
                staffId={staffId}
                onTransactionComplete={loadDashboardData}
              />
            </div>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <Card>
            <div className="p-6">
              <BookingCalendarInterface 
                barbershopId={barbershopId}
                staffId={staffId}
                onAppointmentUpdate={loadDashboardData}
              />
            </div>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <CustomerManagementInterface 
            barbershopId={barbershopId}
            staffId={staffId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}