import { QueryClient } from '@tanstack/react-query';

// Create a single query client instance for the entire app
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes (gcTime in v5)
      gcTime: 10 * 60 * 1000,
      // Only retry once on failure
      retry: 1,
      // Don't refetch on window focus to reduce unnecessary requests
      refetchOnWindowFocus: false,
      // Show previous data while fetching new data
      keepPreviousData: true,
      // Network-only errors should retry
      retryOnMount: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      // Show error toasts on mutation failure
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Helper function to invalidate queries by key pattern
export const invalidateQueries = async (queryKey) => {
  await queryClient.invalidateQueries({ queryKey });
};

// Helper function to prefetch data
export const prefetchQuery = async (queryKey, queryFn) => {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
  });
};

// Helper function to get cached data
export const getCachedData = (queryKey) => {
  return queryClient.getQueryData(queryKey);
};

// Helper function to set cached data optimistically
export const setCachedData = (queryKey, data) => {
  queryClient.setQueryData(queryKey, data);
};

// Helper to clear all queries (useful for logout)
export const clearAllQueries = () => {
  queryClient.clear();
};

// Query key factory for consistent key generation
export const queryKeys = {
  all: ['6fb'],
  
  // Services
  services: {
    all: () => [...queryKeys.all, 'services'],
    byShop: (shopId) => [...queryKeys.services.all(), shopId],
    detail: (shopId, serviceId) => [...queryKeys.services.byShop(shopId), serviceId],
  },
  
  // Appointments
  appointments: {
    all: () => [...queryKeys.all, 'appointments'],
    byShop: (shopId) => [...queryKeys.appointments.all(), shopId],
    byDate: (shopId, date) => [...queryKeys.appointments.byShop(shopId), date],
    detail: (shopId, appointmentId) => [...queryKeys.appointments.byShop(shopId), appointmentId],
  },
  
  // Customers
  customers: {
    all: () => [...queryKeys.all, 'customers'],
    byShop: (shopId) => [...queryKeys.customers.all(), shopId],
    search: (shopId, query) => [...queryKeys.customers.byShop(shopId), 'search', query],
    detail: (shopId, customerId) => [...queryKeys.customers.byShop(shopId), customerId],
  },
  
  // Staff
  staff: {
    all: () => [...queryKeys.all, 'staff'],
    byShop: (shopId) => [...queryKeys.staff.all(), shopId],
    detail: (shopId, staffId) => [...queryKeys.staff.byShop(shopId), staffId],
  },
  
  // Dashboard metrics
  metrics: {
    all: () => [...queryKeys.all, 'metrics'],
    dashboard: (shopId) => [...queryKeys.metrics.all(), 'dashboard', shopId],
    revenue: (shopId, period) => [...queryKeys.metrics.all(), 'revenue', shopId, period],
  },
  
  // Calendar integration
  calendar: {
    all: () => [...queryKeys.all, 'calendar'],
    accounts: (shopId) => [...queryKeys.calendar.all(), 'accounts', shopId],
    settings: (shopId) => [...queryKeys.calendar.all(), 'settings', shopId],
    syncStatus: (shopId) => [...queryKeys.calendar.all(), 'sync-status', shopId],
    conflicts: (shopId, dateRange) => [...queryKeys.calendar.all(), 'conflicts', shopId, dateRange],
  },
  
  // AI suggestions
  ai: {
    all: () => [...queryKeys.all, 'ai'],
    schedulingSuggestions: (shopId, duration, date) => [...queryKeys.ai.all(), 'scheduling', shopId, duration, date],
    noShowPrediction: (appointmentId) => [...queryKeys.ai.all(), 'no-show', appointmentId],
  },
  
  // Barbershop details
  barbershop: {
    all: () => [...queryKeys.all, 'barbershop'],
    detail: (shopId) => [...queryKeys.barbershop.all(), shopId],
    hours: (shopId) => [...queryKeys.barbershop.detail(shopId), 'hours'],
  },

  // Cross-selling and upselling
  crossSelling: {
    all: () => [...queryKeys.all, 'cross-selling'],
    suggestions: (shopId, currentItems, serviceId, customerId) => [
      ...queryKeys.crossSelling.all(), 
      'suggestions', 
      shopId, 
      JSON.stringify(currentItems || []), 
      serviceId, 
      customerId
    ],
    productAffinity: (shopId, filters) => [
      ...queryKeys.crossSelling.all(), 
      'product-affinity', 
      shopId, 
      filters
    ],
    upsellOpportunities: (shopId, context) => [
      ...queryKeys.crossSelling.all(), 
      'upsell-opportunities', 
      shopId, 
      context
    ],
    seasonal: (shopId, month, location) => [
      ...queryKeys.crossSelling.all(), 
      'seasonal', 
      shopId, 
      month, 
      location
    ],
    analytics: (shopId, filters) => [
      ...queryKeys.crossSelling.all(), 
      'analytics', 
      shopId, 
      filters
    ],
    customerReceptivity: (shopId, customerId) => [
      ...queryKeys.crossSelling.all(), 
      'customer-receptivity', 
      shopId, 
      customerId
    ],
  },

  // Inventory forecasting and management
  inventory: {
    all: () => [...queryKeys.all, 'inventory'],
    forecasting: (shopId, options) => [
      ...queryKeys.inventory.all(), 
      'forecasting', 
      shopId, 
      options
    ],
    reorderRecommendations: (shopId, filters) => [
      ...queryKeys.inventory.all(), 
      'reorder-recommendations', 
      shopId, 
      filters
    ],
    alerts: (shopId, filters) => [
      ...queryKeys.inventory.all(), 
      'alerts', 
      shopId, 
      filters
    ],
    seasonalPlanning: (shopId, year, season) => [
      ...queryKeys.inventory.all(), 
      'seasonal-planning', 
      shopId, 
      year, 
      season
    ],
    stockLevels: (shopId) => [
      ...queryKeys.inventory.all(), 
      'stock-levels', 
      shopId
    ],
    performance: (shopId, period) => [
      ...queryKeys.inventory.all(), 
      'performance', 
      shopId, 
      period
    ],
  },
}