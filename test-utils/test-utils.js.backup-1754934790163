import React from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../lib/theme-provider'
import { ToastProvider } from '../lib/toast-provider'

// Create a custom render function that includes providers
function customRender(ui, options = {}) {
  const {
    initialTheme = 'light',
    ...renderOptions
  } = options

  function Wrapper({ children }) {
    return (
      <ThemeProvider defaultTheme={initialTheme}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    )
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  }
}

// Create mock data generators
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'SHOP_OWNER',
  barbershopId: 'test-barbershop-id'
}

export const mockBarbershop = {
  id: 'test-barbershop-id',
  name: 'Test Barbershop',
  address: '123 Test Street',
  phone: '+1234567890',
  email: 'shop@test.com',
  settings: {
    timezone: 'America/New_York',
    currency: 'USD',
    booking_window: 30
  }
}

export const mockAppointment = {
  id: 'test-appointment-id',
  customerId: 'test-customer-id',
  barberId: 'test-barber-id',
  serviceId: 'test-service-id',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  status: 'confirmed',
  price: 50.00,
  notes: 'Test appointment'
}

export const mockService = {
  id: 'test-service-id',
  name: 'Haircut',
  description: 'Standard haircut',
  duration: 60,
  price: 50.00,
  category: 'hair'
}

export const mockAgent = {
  id: 'financial',
  name: '💰 Financial Agent',
  description: 'Revenue optimization and financial planning',
  isActive: true
}

export const mockAgentResponse = {
  sessionId: 'test-session-id',
  agentId: 'financial',
  agentName: '💰 Financial Agent',
  response: 'Test agent response',
  recommendations: [
    {
      id: 'rec-1',
      type: 'pricing',
      priority: 'high',
      title: 'Test Recommendation',
      description: 'Test recommendation description',
      estimatedImpact: '+25%',
      confidence: 0.9,
      timeToImplement: '1 week'
    }
  ],
  metadata: {
    confidence: 0.95,
    ragEnhanced: true,
    businessContextApplied: true,
    timestamp: '2024-01-15T10:00:00Z'
  }
}

// Mock API responses
export const mockApiResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data)
})

// Mock fetch implementation
export const mockFetch = (responses = {}) => {
  return jest.fn().mockImplementation((url, options) => {
    const method = options?.method || 'GET'
    const key = `${method} ${url}`
    
    if (responses[key]) {
      return Promise.resolve(responses[key])
    }
    
    // Default successful response
    return Promise.resolve(mockApiResponse({ success: true }))
  })
}

// Authentication mock helpers
export const mockAuthSession = (user = mockUser) => {
  return {
    user,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}

// Trafft integration mock data
export const mockTrafftData = {
  appointments: [
    {
      id: 1,
      customerId: 101,
      serviceId: 201,
      employeeId: 301,
      datetime: '2024-01-15 10:00:00',
      status: 'approved',
      price: 50.00
    }
  ],
  customers: [
    {
      id: 101,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    }
  ],
  services: [
    {
      id: 201,
      name: 'Haircut',
      duration: 3600,
      price: 50.00,
      categoryId: 401
    }
  ],
  employees: [
    {
      id: 301,
      firstName: 'Test',
      lastName: 'Barber',
      email: 'barber@test.com'
    }
  ]
}

// Performance testing helpers
export const measureRenderTime = (component) => {
  const start = performance.now()
  const result = customRender(component)
  const end = performance.now()
  
  return {
    ...result,
    renderTime: end - start
  }
}

// Accessibility testing helpers
export const getAccessibilityViolations = async (container) => {
  const { axe } = require('jest-axe')
  const results = await axe(container)
  return results.violations
}

// Wait for async operations
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Custom matchers
export const customMatchers = {
  toBeAccessible: async (received) => {
    const violations = await getAccessibilityViolations(received)
    const pass = violations.length === 0
    
    return {
      pass,
      message: () => 
        pass 
          ? `Expected element to have accessibility violations, but it had none`
          : `Expected element to be accessible, but it had ${violations.length} violations:\n${violations.map(v => `- ${v.description}`).join('\n')}`
    }
  },
  
  toHavePerformantRender: (received, maxTime = 100) => {
    const pass = received.renderTime <= maxTime
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected render time to be slower than ${maxTime}ms, but it was ${received.renderTime}ms`
          : `Expected render time to be faster than ${maxTime}ms, but it was ${received.renderTime}ms`
    }
  }
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'

// Override render method
export { customRender as render }