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