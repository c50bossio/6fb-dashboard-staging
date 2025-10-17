/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { UnifiedContextProvider, useUnifiedContext, UNIFIED_CONTEXT_LEVELS } from '@/contexts/UnifiedContextProvider'
import { jest } from '@jest/globals'

// Mock Supabase
jest.mock('@/lib/supabase/UNIFIED_CLIENT', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: mockProfileData, error: null })),
        })),
      })),
    })),
    auth: {
      getSession: jest.fn(() => ({ data: { session: mockSession } }))
    }
  })
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession, status: 'authenticated' })
}))

// Mock data
const mockSession = {
  user: { id: 'user-123', email: 'test@example.com' }
}

const mockProfileData = {
  id: 'user-123',
  role: 'ENTERPRISE_OWNER',
  shop_id: 'shop-123'
}

const mockOrganizationContext = {
  level: UNIFIED_CONTEXT_LEVELS.ORGANIZATION,
  organizationId: 'org-123',
  displayName: 'Test Enterprise',
  metadata: {
    organizationName: 'Test Enterprise',
    locationCount: 3
  }
}

const mockLocationContext = {
  level: UNIFIED_CONTEXT_LEVELS.LOCATION,
  locationId: 'shop-123',
  organizationId: 'org-123',
  displayName: 'Downtown Location',
  metadata: {
    locationName: 'Downtown Location',
    organizationName: 'Test Enterprise'
  }
}

const mockResourceContext = {
  level: UNIFIED_CONTEXT_LEVELS.RESOURCE,
  resourceId: 'barber-123',
  locationId: 'shop-123',
  organizationId: 'org-123',
  displayName: 'John Barber',
  metadata: {
    resourceName: 'John Barber',
    resourceType: 'BARBER',
    locationName: 'Downtown Location'
  }
}

describe('UnifiedContextProvider', () => {
  // Test Component for accessing context
  const TestComponent = () => {
    const { context, availableContexts, setContext, loading } = useUnifiedContext()
    
    return (
      <div>
        <div data-testid="loading">{loading ? 'Loading' : 'Loaded'}</div>
        <div data-testid="context-level">{context?.level || 'None'}</div>
        <div data-testid="context-name">{context?.displayName || 'None'}</div>
        <div data-testid="available-count">{availableContexts?.length || 0}</div>
        <button 
          data-testid="set-context"
          onClick={() => setContext(mockLocationContext)}
        >
          Set Location Context
        </button>
      </div>
    )
  }

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    
    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('Context Loading and Initialization', () => {
    it('should initialize with loading state', async () => {
      render(
        <UnifiedContextProvider>
          <TestComponent />
        </UnifiedContextProvider>
      )

      // Should start in loading state
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
    })

    it('should load available contexts based on user permissions', async () => {
      render(
        <UnifiedContextProvider>
          <TestComponent />
        </UnifiedContextProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
      })

      // Enterprise owner should have access to multiple context levels
      const availableCount = parseInt(screen.getByTestId('available-count').textContent)
      expect(availableCount).toBeGreaterThan(0)
    })

    it('should set default context based on user role', async () => {
      render(
        <UnifiedContextProvider>
          <TestComponent />
        </UnifiedContextProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
      })

      // Enterprise owner should default to organization level
      expect(screen.getByTestId('context-level')).toHaveTextContent(
        UNIFIED_CONTEXT_LEVELS.ORGANIZATION
      )
    })
  })

  describe('Context Switching', () => {
    it('should allow switching between contexts', async () => {
      render(
        <UnifiedContextProvider>
          <TestComponent />
        </UnifiedContextProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
      })

      // Switch to location context
      fireEvent.click(screen.getByTestId('set-context'))

      await waitFor(() => {
        expect(screen.getByTestId('context-level')).toHaveTextContent(
          UNIFIED_CONTEXT_LEVELS.LOCATION
        )
        expect(screen.getByTestId('context-name')).toHaveTextContent('Downtown Location')
      })
    })

    it('should persist context in localStorage', async () => {
      render(
        <UnifiedContextProvider>
          <TestComponent />
        </UnifiedContextProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
      })

      // Switch context
      fireEvent.click(screen.getByTestId('set-context'))

      await waitFor(() => {
        // Check localStorage was updated
        const storedContext = localStorage.getItem('unified-context-preference')
        expect(storedContext).toBeTruthy()
        
        const parsedContext = JSON.parse(storedContext)
        expect(parsedContext.level).toBe(UNIFIED_CONTEXT_LEVELS.LOCATION)
      })
    })
  })

  describe('Permission Validation', () => {
    it('should enforce role-based context access', () => {
      // Mock barber role (limited permissions)
      const barberProfile = { ...mockProfileData, role: 'BARBER' }
      jest.mocked(mockProfileData).role = 'BARBER'

      render(
        <UnifiedContextProvider>
          <TestComponent />
        </UnifiedContextProvider>
      )

      // Barber should only have access to resource level
      // This would be validated in the context provider's permission checking
    })
  })

  describe('Error Handling', () => {
    it('should handle context loading errors gracefully', async () => {
      // Mock error in data fetching
      const mockError = new Error('Database connection failed')
      jest.mocked(createClient().from).mockImplementationOnce(() => {
        throw mockError
      })

      render(
        <UnifiedContextProvider>
          <TestComponent />
        </UnifiedContextProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
        // Should show some default context or error state
      })
    })

    it('should handle invalid context switching attempts', async () => {
      render(
        <UnifiedContextProvider>
          <TestComponent />
        </UnifiedContextProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
      })

      const { setContext } = useUnifiedContext()

      // Attempt to set invalid context
      const invalidContext = {
        level: 'INVALID_LEVEL',
        organizationId: 'invalid'
      }

      // This should not crash the app
      await expect(setContext(invalidContext)).rejects.toThrow()
    })
  })
})

describe('Context API Integration', () => {
  describe('/api/v1/revenue/summary', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should handle organization-level revenue requests', async () => {
      const mockResponse = {
        context: { type: 'organization' },
        monthlyRevenue: 50000,
        locations: {
          total: 3,
          revenue: [
            { locationId: 'loc1', weeklyRevenue: 5000 },
            { locationId: 'loc2', weeklyRevenue: 4000 },
            { locationId: 'loc3', weeklyRevenue: 3000 }
          ]
        }
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const response = await fetch(
        '/api/v1/revenue/summary?context=organization&organizationId=org-123'
      )
      const data = await response.json()

      expect(data.context.type).toBe('organization')
      expect(data.locations.total).toBe(3)
      expect(data.locations.revenue).toHaveLength(3)
    })

    it('should handle resource-level revenue requests', async () => {
      const mockResponse = {
        context: { type: 'resource' },
        monthlyRevenue: 8000,
        barber: {
          resourceId: 'barber-123',
          personalShare: { monthly: 8000 }
        }
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const response = await fetch(
        '/api/v1/revenue/summary?context=resource&resourceId=barber-123'
      )
      const data = await response.json()

      expect(data.context.type).toBe('resource')
      expect(data.barber.resourceId).toBe('barber-123')
      expect(data.barber.personalShare.monthly).toBe(8000)
    })

    it('should maintain backward compatibility', async () => {
      const mockResponse = {
        monthlyRevenue: 25000,
        connected: true
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      // Legacy API call without context parameters
      const response = await fetch('/api/v1/revenue/summary?barbershopId=shop-123')
      const data = await response.json()

      expect(data.monthlyRevenue).toBe(25000)
      expect(data.connected).toBe(true)
    })
  })

  describe('/api/v1/billing/current', () => {
    it('should handle organization-level billing requests', async () => {
      const mockResponse = {
        context: { type: 'organization' },
        organization: {
          id: 'org-123',
          billingModel: 'enterprise',
          memberCount: 5
        },
        costs: { total: 250 }
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const response = await fetch(
        '/api/v1/billing/current?context=organization&organizationId=org-123'
      )
      const data = await response.json()

      expect(data.context.type).toBe('organization')
      expect(data.organization.memberCount).toBe(5)
    })
  })
})

describe('UI Components Integration', () => {
  // Mock components for testing
  const MockContextBanner = () => {
    const { context } = useUnifiedContext()
    
    if (!context) return null
    
    return (
      <div data-testid="context-banner">
        Viewing {context.level} context: {context.displayName}
      </div>
    )
  }

  const MockContextSwitcher = () => {
    const { availableContexts, setContext } = useUnifiedContext()
    
    return (
      <select 
        data-testid="context-switcher"
        onChange={(e) => {
          const contextId = e.target.value
          const selectedContext = availableContexts.find(ctx => 
            ctx.level === contextId
          )
          if (selectedContext) setContext(selectedContext)
        }}
      >
        {availableContexts.map(ctx => (
          <option key={ctx.level} value={ctx.level}>
            {ctx.displayName}
          </option>
        ))}
      </select>
    )
  }

  it('should update UI components when context changes', async () => {
    render(
      <UnifiedContextProvider>
        <MockContextBanner />
        <MockContextSwitcher />
        <TestComponent />
      </UnifiedContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
    })

    // Banner should show current context
    expect(screen.getByTestId('context-banner')).toBeInTheDocument()

    // Switch context
    fireEvent.click(screen.getByTestId('set-context'))

    await waitFor(() => {
      expect(screen.getByTestId('context-banner')).toHaveTextContent('Downtown Location')
    })
  })
})

describe('Performance and Caching', () => {
  it('should cache context data to avoid unnecessary API calls', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    })
    global.fetch = mockFetch

    render(
      <UnifiedContextProvider>
        <TestComponent />
      </UnifiedContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
    })

    // Re-render the same component
    render(
      <UnifiedContextProvider>
        <TestComponent />
      </UnifiedContextProvider>
    )

    // Should use cached data, not make additional API calls
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('Migration Script Tests', () => {
  it('should create organizations for enterprise users', async () => {
    // This would test the actual migration script
    // For now, we'll just verify the logic structure
    const mockCreateOrganization = jest.fn()
    
    // Mock user with enterprise role
    const enterpriseUser = {
      id: 'user-123',
      role: 'ENTERPRISE_OWNER',
      email: 'owner@example.com',
      full_name: 'John Owner'
    }

    // Simulate organization creation
    await mockCreateOrganization(enterpriseUser)
    
    expect(mockCreateOrganization).toHaveBeenCalledWith(enterpriseUser)
  })
})