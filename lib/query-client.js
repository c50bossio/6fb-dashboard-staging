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
    byShop: (barbershopId) => [...queryKeys.services.all(), barbershopId],
    detail: (barbershopId, serviceId) => [...queryKeys.services.byShop(barbershopId), serviceId],
  },
  
  // Appointments
  appointments: {
    all: () => [...queryKeys.all, 'appointments'],
    byShop: (barbershopId) => [...queryKeys.appointments.all(), barbershopId],
    byDate: (barbershopId, date) => [...queryKeys.appointments.byShop(barbershopId), date],
    detail: (barbershopId, appointmentId) => [...queryKeys.appointments.byShop(barbershopId), appointmentId],
  },
  
  // Customers
  customers: {
    all: () => [...queryKeys.all, 'customers'],
    byShop: (barbershopId) => [...queryKeys.customers.all(), barbershopId],
    search: (barbershopId, query) => [...queryKeys.customers.byShop(barbershopId), 'search', query],
    detail: (barbershopId, customerId) => [...queryKeys.customers.byShop(barbershopId), customerId],
  },
  
  // Staff
  staff: {
    all: () => [...queryKeys.all, 'staff'],
    byShop: (barbershopId) => [...queryKeys.staff.all(), barbershopId],
    detail: (barbershopId, staffId) => [...queryKeys.staff.byShop(barbershopId), staffId],
  },
  
  // Dashboard metrics
  metrics: {
    all: () => [...queryKeys.all, 'metrics'],
    dashboard: (barbershopId) => [...queryKeys.metrics.all(), 'dashboard', barbershopId],
    revenue: (barbershopId, period) => [...queryKeys.metrics.all(), 'revenue', barbershopId, period],
  },
  
  // Calendar integration
  calendar: {
    all: () => [...queryKeys.all, 'calendar'],
    accounts: (barbershopId) => [...queryKeys.calendar.all(), 'accounts', barbershopId],
    settings: (barbershopId) => [...queryKeys.calendar.all(), 'settings', barbershopId],
    syncStatus: (barbershopId) => [...queryKeys.calendar.all(), 'sync-status', barbershopId],
    conflicts: (barbershopId, dateRange) => [...queryKeys.calendar.all(), 'conflicts', barbershopId, dateRange],
  },
  
  // AI suggestions
  ai: {
    all: () => [...queryKeys.all, 'ai'],
    schedulingSuggestions: (barbershopId, duration, date) => [...queryKeys.ai.all(), 'scheduling', barbershopId, duration, date],
    noShowPrediction: (appointmentId) => [...queryKeys.ai.all(), 'no-show', appointmentId],
  },
  
  // Barbershop details
  barbershop: {
    all: () => [...queryKeys.all, 'barbershop'],
    detail: (barbershopId) => [...queryKeys.barbershop.all(), barbershopId],
    hours: (barbershopId) => [...queryKeys.barbershop.detail(barbershopId), 'hours'],
  },

  // Cross-selling and upselling
  crossSelling: {
    all: () => [...queryKeys.all, 'cross-selling'],
    suggestions: (barbershopId, currentItems, serviceId, customerId) => [
      ...queryKeys.crossSelling.all(), 
      'suggestions', 
      barbershopId, 
      JSON.stringify(currentItems || []), 
      serviceId, 
      customerId
    ],
    productAffinity: (barbershopId, filters) => [
      ...queryKeys.crossSelling.all(), 
      'product-affinity', 
      barbershopId, 
      filters
    ],
    upsellOpportunities: (barbershopId, context) => [
      ...queryKeys.crossSelling.all(), 
      'upsell-opportunities', 
      barbershopId, 
      context
    ],
    seasonal: (barbershopId, month, location) => [
      ...queryKeys.crossSelling.all(), 
      'seasonal', 
      barbershopId, 
      month, 
      location
    ],
    analytics: (barbershopId, filters) => [
      ...queryKeys.crossSelling.all(), 
      'analytics', 
      barbershopId, 
      filters
    ],
    customerReceptivity: (barbershopId, customerId) => [
      ...queryKeys.crossSelling.all(), 
      'customer-receptivity', 
      barbershopId, 
      customerId
    ],
  },

  // Inventory forecasting and management
  inventory: {
    all: () => [...queryKeys.all, 'inventory'],
    forecasting: (barbershopId, options) => [
      ...queryKeys.inventory.all(), 
      'forecasting', 
      barbershopId, 
      options
    ],
    reorderRecommendations: (barbershopId, filters) => [
      ...queryKeys.inventory.all(), 
      'reorder-recommendations', 
      barbershopId, 
      filters
    ],
    alerts: (barbershopId, filters) => [
      ...queryKeys.inventory.all(), 
      'alerts', 
      barbershopId, 
      filters
    ],
    seasonalPlanning: (barbershopId, year, season) => [
      ...queryKeys.inventory.all(), 
      'seasonal-planning', 
      barbershopId, 
      year, 
      season
    ],
    stockLevels: (barbershopId) => [
      ...queryKeys.inventory.all(), 
      'stock-levels', 
      barbershopId
    ],
    performance: (barbershopId, period) => [
      ...queryKeys.inventory.all(), 
      'performance', 
      barbershopId, 
      period
    ],
  },
}