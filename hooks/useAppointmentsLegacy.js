import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT';

/**
 * Hook for fetching and managing appointments
 * Uses React Query for caching and background updates
 */
export const useAppointments = (barbershopId, dateRange = null) => {
  const queryClient = useQueryClient();
  
  // Main query for appointments
  const query = useQuery({
    queryKey: ['appointments', barbershopId, dateRange],
    queryFn: () => createClient().getAppointments(barbershopId, dateRange),
    enabled: !!barbershopId,
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Real-time subscription
  useEffect(() => {
    if (!barbershopId) return;

    const unsubscribe = createClient().subscribeToAppointments(barbershopId, (payload) => {
      // Invalidate cache when appointments change
      queryClient.invalidateQueries({ queryKey: ['appointments', barbershopId] });
      
      // Also invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', barbershopId] });
    });

    return unsubscribe;
  }, [barbershopId, queryClient]);

  return query;
};

/**
 * Hook for creating appointments
 */
export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (appointmentData) => createClient().createAppointment(appointmentData),
    onSuccess: (data) => {
      // Invalidate appointments list
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      // Optionally update cache optimistically
      const barbershopId = data.barberbarbershop_id;
      queryClient.setQueryData(
        ['appointments', barbershopId],
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
    mutationFn: ({ id, updates }) => createClient().updateAppointment(id, updates),
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
    mutationFn: (appointmentId) => createClient().deleteAppointment(appointmentId),
    onSuccess: () => {
      // Invalidate appointments list
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      console.error('Failed to delete appointment:', error);
    }
  });
};