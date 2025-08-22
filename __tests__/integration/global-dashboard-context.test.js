/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { GlobalDashboardProvider, useGlobalDashboard } from '../../contexts/GlobalDashboardContext'
import { useAuth } from '../../components/SupabaseAuthProvider'

// Mock the auth hook
jest.mock('../../components/SupabaseAuthProvider', () => ({
  useAuth: jest.fn()
}))

// Mock Supabase client
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        in: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        single: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }))
}))

// Test component to access context
function TestComponent() {
  const context = useGlobalDashboard()
  
  return (
    <div>
      <div data-testid="selected-locations">
        {context.selectedLocations.join(',')}
      </div>
      <div data-testid="selected-barbers">
        {context.selectedBarbers.join(',')}
      </div>
      <div data-testid="view-mode">
        {context.viewMode}
      </div>
      <div data-testid="is-multi-location">
        {context.isMultiLocation ? 'true' : 'false'}
      </div>
      <div data-testid="permissions">
        {JSON.stringify(context.permissions)}
      </div>
      <button 
        data-testid="select-all-locations"
        onClick={context.selectAllLocations}
      >
        Select All Locations
      </button>
      <button 
        data-testid="clear-locations"
        onClick={context.clearLocationSelection}
      >
        Clear Locations
      </button>
    </div>
  )
}

describe('GlobalDashboardContext', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()
    
    // Reset mocks
    jest.clearAllMocks()
  })
  
  describe('Role-based permissions', () => {
    it('should provide enterprise permissions for ENTERPRISE_OWNER role', () => {
      useAuth.mockReturnValue({
        user: { id: 'user-1' },
        profile: { id: 'user-1' },
        userRole: 'ENTERPRISE_OWNER'
      })
      
      const { getByTestId } = render(
        <GlobalDashboardProvider>
          <TestComponent />
        </GlobalDashboardProvider>
      )
      
      const permissions = JSON.parse(getByTestId('permissions').textContent)
      expect(permissions.canSeeAllLocations).toBe(true)
      expect(permissions.canAddLocations).toBe(true)
      expect(permissions.canCrossLocationManage).toBe(true)
    })
    
    it('should provide shop owner permissions for SHOP_OWNER role', () => {
      useAuth.mockReturnValue({
        user: { id: 'user-1' },
        profile: { id: 'user-1', shop_id: 'shop-1' },
        userRole: 'SHOP_OWNER'
      })
      
      const { getByTestId } = render(
        <GlobalDashboardProvider>
          <TestComponent />
        </GlobalDashboardProvider>
      )
      
      const permissions = JSON.parse(getByTestId('permissions').textContent)
      expect(permissions.canSeeOwnLocation).toBe(true)
      expect(permissions.canAddBarbers).toBe(true)
      expect(permissions.canSeeAllLocations).toBeFalsy()
    })
    
    it('should provide barber permissions for BARBER role', () => {
      useAuth.mockReturnValue({
        user: { id: 'user-1' },
        profile: { id: 'user-1' },
        userRole: 'BARBER'
      })
      
      const { getByTestId } = render(
        <GlobalDashboardProvider>
          <TestComponent />
        </GlobalDashboardProvider>
      )
      
      const permissions = JSON.parse(getByTestId('permissions').textContent)
      expect(permissions.canSeeOwnSchedule).toBe(true)
      expect(permissions.canViewOwnMetrics).toBe(true)
      expect(permissions.canSeeAllLocations).toBeFalsy()
      expect(permissions.canAddBarbers).toBeFalsy()
    })
    
    it('should provide customer permissions for CLIENT role', () => {
      useAuth.mockReturnValue({
        user: { id: 'user-1' },
        profile: { id: 'user-1' },
        userRole: 'CLIENT'
      })
      
      const { getByTestId } = render(
        <GlobalDashboardProvider>
          <TestComponent />
        </GlobalDashboardProvider>
      )
      
      const permissions = JSON.parse(getByTestId('permissions').textContent)
      expect(permissions.canBookAppointments).toBe(true)
      expect(permissions.canViewAvailability).toBe(true)
      expect(permissions.canSeeAllLocations).toBeFalsy()
    })
  })
  
  describe('Context persistence', () => {
    it('should save context to localStorage', async () => {
      useAuth.mockReturnValue({
        user: { id: 'user-1' },
        profile: { id: 'user-1' },
        userRole: 'ENTERPRISE_OWNER'
      })
      
      const { getByTestId } = render(
        <GlobalDashboardProvider>
          <TestComponent />
        </GlobalDashboardProvider>
      )
      
      // Wait for initialization
      await waitFor(() => {
        expect(getByTestId('view-mode').textContent).toBe('individual')
      })
      
      // Check localStorage was updated
      const savedContext = localStorage.getItem('globalDashboardContext_user-1')
      expect(savedContext).toBeTruthy()
      
      const parsed = JSON.parse(savedContext)
      expect(parsed.viewMode).toBe('individual')
      expect(parsed.lastUpdated).toBeDefined()
    })
    
    it('should restore context from localStorage', async () => {
      // Set up saved context
      const savedContext = {
        selectedLocations: ['loc-1', 'loc-2'],
        selectedBarbers: ['barber-1'],
        viewMode: 'consolidated',
        timeRange: { start: '2024-01-01', end: '2024-01-31' },
        lastUpdated: Date.now()
      }
      
      localStorage.setItem('globalDashboardContext_user-1', JSON.stringify(savedContext))
      
      useAuth.mockReturnValue({
        user: { id: 'user-1' },
        profile: { id: 'user-1' },
        userRole: 'ENTERPRISE_OWNER'
      })
      
      const { getByTestId } = render(
        <GlobalDashboardProvider>
          <TestComponent />
        </GlobalDashboardProvider>
      )
      
      // Should restore saved values
      await waitFor(() => {
        expect(getByTestId('view-mode').textContent).toBe('consolidated')
      })
      
      expect(getByTestId('selected-locations').textContent).toBe('loc-1,loc-2')
      expect(getByTestId('selected-barbers').textContent).toBe('barber-1')
    })
    
    it('should not restore context older than 24 hours', async () => {
      // Set up old context
      const oldContext = {
        selectedLocations: ['old-loc'],
        viewMode: 'comparison',
        lastUpdated: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      }
      
      localStorage.setItem('globalDashboardContext_user-1', JSON.stringify(oldContext))
      
      useAuth.mockReturnValue({
        user: { id: 'user-1' },
        profile: { id: 'user-1' },
        userRole: 'ENTERPRISE_OWNER'
      })
      
      const { getByTestId } = render(
        <GlobalDashboardProvider>
          <TestComponent />
        </GlobalDashboardProvider>
      )
      
      // Should use defaults, not old saved values
      await waitFor(() => {
        expect(getByTestId('view-mode').textContent).toBe('individual')
      })
      
      expect(getByTestId('selected-locations').textContent).toBe('')
    })
  })
  
  describe('Selection management', () => {
    it('should handle location selection and deselection', async () => {
      useAuth.mockReturnValue({
        user: { id: 'user-1' },
        profile: { id: 'user-1' },
        userRole: 'ENTERPRISE_OWNER'
      })
      
      // Mock available locations
      const mockLocations = [
        { id: 'loc-1', name: 'Location 1' },
        { id: 'loc-2', name: 'Location 2' }
      ]
      
      const TestComponentWithActions = () => {
        const context = useGlobalDashboard()
        
        React.useEffect(() => {
          // Simulate locations being loaded
          if (context.availableLocations.length === 0) {
            // This would normally be done by the context internally
            context.setSelectedLocations(['loc-1'])
          }
        }, [context])
        
        return (
          <div>
            <div data-testid="selected-locations">
              {context.selectedLocations.join(',')}
            </div>
            <button 
              data-testid="add-location"
              onClick={() => context.setSelectedLocations([...context.selectedLocations, 'loc-2'])}
            >
              Add Location 2
            </button>
            <button 
              data-testid="remove-location"
              onClick={() => context.setSelectedLocations(
                context.selectedLocations.filter(id => id !== 'loc-1')
              )}
            >
              Remove Location 1
            </button>
          </div>
        )
      }
      
      const { getByTestId } = render(
        <GlobalDashboardProvider>
          <TestComponentWithActions />
        </GlobalDashboardProvider>
      )
      
      // Initially should have loc-1
      await waitFor(() => {
        expect(getByTestId('selected-locations').textContent).toBe('loc-1')
      })
      
      // Add location 2
      fireEvent.click(getByTestId('add-location'))
      await waitFor(() => {
        expect(getByTestId('selected-locations').textContent).toBe('loc-1,loc-2')
      })
      
      // Remove location 1
      fireEvent.click(getByTestId('remove-location'))
      await waitFor(() => {
        expect(getByTestId('selected-locations').textContent).toBe('loc-2')
      })
    })
  })
})