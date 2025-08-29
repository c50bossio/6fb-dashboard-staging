import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/services/supabase-service';
import { useEffect } from 'react';

/**
 * Hook for fetching and managing appointments
 * Uses React Query for caching and background updates
 */
export const useAppointments = (shopId, dateRange = null) => {
  const queryClient = useQueryClient();
  
  // Main query for appointments
  const query = useQuery({
    queryKey: ['appointments', shopId, dateRange],
    queryFn: () => supabaseService.getAppointments(shopId, dateRange),
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Real-time subscription
  useEffect(() => {
    if (!shopId) return;

    const unsubscribe = supabaseService.subscribeToAppointments(shopId, (payload) => {
      // Invalidate cache when appointments change
      queryClient.invalidateQueries({ queryKey: ['appointments', shopId] });
      
      // Also invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shopId] });
    });

    return unsubscribe;
  }, [shopId, queryClient]);

  return query;
};

/**
 * Hook for creating appointments
 */
export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (appointmentData) => supabaseService.createAppointment(appointmentData),
    onSuccess: (data) => {
      // Invalidate appointments list
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      // Optionally update cache optimistically
      const shopId = data.barbershop_id;
      queryClient.setQueryData(
        ['appointments', shopId],
        (oldData) => oldData ? [...oldData, data] : [data]
      );
    },
    onError: (error) => {
      console.error('Failed to create appointment:', error);
    }
  });
};

/**
 * Hook for updating appointments
 */
export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }) => supabaseService.updateAppointment(id, updates),
    onSuccess: (data) => {
      // Invalidate appointments list
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      console.error('Failed to update appointment:', error);
    }
  });
};

/**
 * Hook for deleting appointments
 */
export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (appointmentId) => supabaseService.deleteAppointment(appointmentId),
    onSuccess: () => {
      // Invalidate appointments list
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      console.error('Failed to delete appointment:', error);
    }
  });
};