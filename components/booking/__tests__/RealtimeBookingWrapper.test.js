import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import RealtimeBookingWrapper, { useRealtimeBooking } from '../RealtimeBookingWrapper'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: {
            business_hours: {
              monday: { open: '09:00', close: '18:00' },
              tuesday: { open: '09:00', close: '18:00' },
              wednesday: { open: '09:00', close: '18:00' },
              thursday: { open: '09:00', close: '18:00' },
              friday: { open: '09:00', close: '18:00' },
              saturday: { open: '09:00', close: '16:00' },
              sunday: null
            },
            timezone: 'America/New_York',
            booking_settings: {
              slot_duration: 30,
              buffer_time: 15
            }
          }
        })),
        gte: vi.fn(() => ({
          lt: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({
              data: []
            }))
          }))
        }))
      }))
    }))
  })),
  channel: vi.fn(() => ({
    on: vi.fn(() => ({
      subscribe: vi.fn((callback) => {
        // Simulate successful subscription
        setTimeout(() => callback('SUBSCRIBED'), 100)
        return {
          unsubscribe: vi.fn()
        }
      })
    }))
  })),
  removeChannel: vi.fn()
}

// Mock the createClient function
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

// Mock the booking components
vi.mock('../PublicBookingFlow', () => ({
  default: ({ availableSlots, onDateTimeSelect }) => (
    <div data-testid="public-booking-flow">
      <div>Available Slots: {availableSlots?.length || 0}</div>
      <button 
        onClick={() => onDateTimeSelect?.('2024-01-15T14:00:00Z', { id: 'service1' }, 30)}
        data-testid="select-time"
      >
        Select Time
      </button>
    </div>
  )
}))

vi.mock('../BookingFlowOrchestrator', () => ({
  default: ({ availableSlots, realtimeConnected }) => (
    <div data-testid="orchestrator">
      <div>Slots: {availableSlots?.length || 0}</div>
      <div>Realtime: {realtimeConnected ? 'Connected' : 'Disconnected'}</div>
    </div>
  )
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => children
}))

describe('RealtimeBookingWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock network status
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true
    })
  })

  describe('Basic Functionality', () => {
    test('renders with required props', async () => {
      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          flowComponent="public"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    test('passes enhanced props to wrapped component', async () => {
      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          flowComponent="public"
          enableRealtime={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Available Slots: 0')).toBeInTheDocument()
      })
    })

    test('selects appropriate component based on flowComponent prop', async () => {
      const { rerender } = render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          flowComponent="orchestrator"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('orchestrator')).toBeInTheDocument()
      })

      rerender(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          flowComponent="public"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Features', () => {
    test('establishes real-time connection when enabled', async () => {
      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          flowComponent="orchestrator"
          enableRealtime={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Realtime: Connected')).toBeInTheDocument()
      }, { timeout: 3000 })

      expect(mockSupabase.channel).toHaveBeenCalledWith('bookings-shop-123')
    })

    test('handles real-time subscription errors gracefully', async () => {
      // Mock subscription failure
      mockSupabase.channel.mockReturnValueOnce({
        on: vi.fn(() => ({
          subscribe: vi.fn((callback) => {
            setTimeout(() => callback('CHANNEL_ERROR'), 100)
            return { unsubscribe: vi.fn() }
          })
        }))
      })

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          flowComponent="orchestrator"
          enableRealtime={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Realtime: Disconnected')).toBeInTheDocument()
      })
    })

    test('shows real-time status indicator', async () => {
      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          enableRealtime={true}
          debugMode={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Live Updates|Connecting/)).toBeInTheDocument()
      })
    })
  })

  describe('Conflict Prevention', () => {
    test('validates time slots when enabled', async () => {
      const onSlotConflict = vi.fn()

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          flowComponent="public"
          enableConflictPrevention={true}
          onSlotConflict={onSlotConflict}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })

      const selectButton = screen.getByTestId('select-time')
      fireEvent.click(selectButton)

      // Should validate the selected time slot
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('bookings')
      })
    })

    test('shows conflict warning when slot becomes unavailable', async () => {
      // Mock conflict in booking data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lt: vi.fn(() => ({
                in: vi.fn(() => Promise.resolve({
                  data: [{
                    id: 'booking-1',
                    start_time: '2024-01-15T14:00:00Z',
                    duration_minutes: 30,
                    customer_name: 'John Doe'
                  }]
                }))
              }))
            }))
          }))
        }))
      })

      const onSlotConflict = vi.fn()

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          flowComponent="public"
          enableConflictPrevention={true}
          onSlotConflict={onSlotConflict}
        />
      )

      await waitFor(() => {
        const selectButton = screen.getByTestId('select-time')
        fireEvent.click(selectButton)
      })

      await waitFor(() => {
        expect(onSlotConflict).toHaveBeenCalledWith(
          expect.objectContaining({
            datetime: '2024-01-15T14:00:00Z',
            error: expect.any(String)
          })
        )
      })
    })
  })

  describe('Network Handling', () => {
    test('handles offline state gracefully', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      })

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          enableRealtime={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument()
      })
    })

    test('shows network status changes', async () => {
      const onNetworkStatusChange = vi.fn()

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          onNetworkStatusChange={onNetworkStatusChange}
        />
      )

      // Simulate network change
      const offlineEvent = new Event('offline')
      window.dispatchEvent(offlineEvent)

      await waitFor(() => {
        expect(onNetworkStatusChange).toHaveBeenCalledWith(
          expect.objectContaining({
            online: false
          })
        )
      })
    })
  })

  describe('Debug Mode', () => {
    test('shows debug panel when enabled', async () => {
      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          debugMode={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('RealtimeBookingWrapper Debug')).toBeInTheDocument()
      })
    })

    test('hides debug panel when disabled', () => {
      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          debugMode={false}
        />
      )

      expect(screen.queryByText('RealtimeBookingWrapper Debug')).not.toBeInTheDocument()
    })
  })

  describe('Event Handlers', () => {
    test('calls onAvailabilityUpdate when slots are loaded', async () => {
      const onAvailabilityUpdate = vi.fn()

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          onAvailabilityUpdate={onAvailabilityUpdate}
        />
      )

      await waitFor(() => {
        expect(onAvailabilityUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            slots: expect.any(Array),
            conflicts: expect.any(Array),
            lastChecked: expect.any(Date)
          })
        )
      })
    })

    test('calls onRealtimeError when subscription fails', async () => {
      const onRealtimeError = vi.fn()
      
      // Mock error in availability check
      mockSupabase.from.mockRejectedValueOnce(new Error('Database error'))

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          onRealtimeError={onRealtimeError}
        />
      )

      await waitFor(() => {
        expect(onRealtimeError).toHaveBeenCalledWith(
          expect.any(Error)
        )
      })
    })
  })
})

describe('useRealtimeBooking hook', () => {
  test('provides real-time booking functionality', async () => {
    let hookResult = null

    function TestComponent() {
      hookResult = useRealtimeBooking({
        barbershopId: 'shop-123',
        enableRealtime: true
      })
      
      return (
        <div>
          <div data-testid="slots-count">{hookResult.availableSlots.length}</div>
          <div data-testid="loading">{hookResult.loading ? 'Loading' : 'Loaded'}</div>
          <div data-testid="connected">{hookResult.realtimeConnected ? 'Connected' : 'Disconnected'}</div>
        </div>
      )
    }

    render(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
    })

    expect(hookResult).toHaveProperty('availableSlots')
    expect(hookResult).toHaveProperty('checkAvailability')
    expect(hookResult).toHaveProperty('validateSlot')
    expect(typeof hookResult.checkAvailability).toBe('function')
    expect(typeof hookResult.validateSlot).toBe('function')
  })

  test('handles errors in hook gracefully', async () => {
    // Mock error in availability check
    mockSupabase.from.mockRejectedValueOnce(new Error('Hook error'))

    let hookResult = null

    function TestComponent() {
      hookResult = useRealtimeBooking({
        barbershopId: 'shop-123',
        enableRealtime: true
      })
      
      return <div data-testid="error">{hookResult.error || 'No error'}</div>
    }

    render(<TestComponent />)

    await waitFor(() => {
      expect(hookResult.error).toBeTruthy()
    })
  })
})

describe('Accessibility', () => {
  test('provides appropriate ARIA labels and roles', async () => {
    render(
      <RealtimeBookingWrapper 
        barbershopId="shop-123"
        flowComponent="public"
        enableRealtime={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })

    // Status indicators should be accessible
    const statusIndicators = screen.getAllByRole('status', { hidden: true })
    expect(statusIndicators.length).toBeGreaterThan(0)
  })

  test('supports keyboard navigation', async () => {
    render(
      <RealtimeBookingWrapper 
        barbershopId="shop-123"
        flowComponent="public"
      />
    )

    await waitFor(() => {
      const selectButton = screen.getByTestId('select-time')
      expect(selectButton).toBeInTheDocument()
      
      // Button should be focusable
      selectButton.focus()
      expect(document.activeElement).toBe(selectButton)
    })
  })
})

describe('Performance', () => {
  test('lazy loads components', async () => {
    const { container } = render(
      <RealtimeBookingWrapper 
        barbershopId="shop-123"
        flowComponent="public"
      />
    )

    // Should show loading state initially
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })
  })

  test('cleans up subscriptions on unmount', () => {
    const { unmount } = render(
      <RealtimeBookingWrapper 
        barbershopId="shop-123"
        enableRealtime={true}
      />
    )

    unmount()

    expect(mockSupabase.removeChannel).toHaveBeenCalled()
  })

  test('debounces rapid availability checks', async () => {
    vi.useFakeTimers()

    render(
      <RealtimeBookingWrapper 
        barbershopId="shop-123"
        flowComponent="public"
        conflictCheckDelay={500}
      />
    )

    // Simulate rapid time selections
    await waitFor(() => {
      const selectButton = screen.getByTestId('select-time')
      fireEvent.click(selectButton)
      fireEvent.click(selectButton)
      fireEvent.click(selectButton)
    })

    // Only one check should be scheduled after debounce
    vi.advanceTimersByTime(500)

    await waitFor(() => {
      // Verify debouncing worked by checking call count
      expect(mockSupabase.from).toHaveBeenCalledTimes(3) // Initial load + debounced check
    })

    vi.useRealTimers()
  })
})