/**
 * Custom Test Utils for 6FB AI Agent System
 * Provides enhanced testing utilities with proper provider wrapping
 */

import React from 'react'
import { render as rtlRender, screen } from '@testing-library/react'
import { jest } from '@jest/globals'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  pathname: '/customize',
  searchParams: new URLSearchParams(),
  query: {},
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockRouter.searchParams,
  usePathname: () => mockRouter.pathname,
  notFound: jest.fn(),
}))

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
      data: [],
      error: null,
    })),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://test.com/image.jpg' } })),
    })),
  },
}

jest.mock('@/lib/supabase/UNIFIED_CLIENT', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock Auth Provider
const MockAuthProvider = ({ children, user = null, profile = null }) => {
  const authValue = {
    user: user || {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
    profile: profile || {
      id: 'test-profile-id',
      role: 'SHOP_OWNER',
      shop_id: 'test-shop-id',
      full_name: 'Test User',
    },
    loading: false,
    signOut: jest.fn(),
    signIn: jest.fn(),
  }

  const AuthContext = React.createContext(authValue)
  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
}

// Test Data Factories
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  created_at: new Date().toISOString(),
  ...overrides,
})

export const createTestProfile = (overrides = {}) => ({
  id: 'test-profile-id',
  user_id: 'test-user-id',
  role: 'SHOP_OWNER',
  shop_id: 'test-shop-id',
  full_name: 'Test User',
  phone: '+1234567890',
  bio: 'Test bio',
  years_experience: 5,
  specializations: ['Haircuts', 'Beard Trims'],
  profile_image_url: 'https://test.com/profile.jpg',
  ...overrides,
})

export const createTestShop = (overrides = {}) => ({
  id: 'test-shop-id',
  name: 'Test Barbershop',
  address: '123 Test Street',
  phone: '+1234567890',
  email: 'shop@test.com',
  business_hours: {
    monday: { open: '09:00', close: '17:00' },
    tuesday: { open: '09:00', close: '17:00' },
    wednesday: { open: '09:00', close: '17:00' },
    thursday: { open: '09:00', close: '17:00' },
    friday: { open: '09:00', close: '17:00' },
    saturday: { open: '09:00', close: '15:00' },
    sunday: { closed: true },
  },
  ...overrides,
})

// Enhanced render function with providers
function render(ui, options = {}) {
  const {
    user = null,
    profile = null,
    preloadedState = {},
    ...renderOptions
  } = options

  function Wrapper({ children }) {
    return (
      <MockAuthProvider user={user} profile={profile}>
        {children}
      </MockAuthProvider>
    )
  }

  const result = rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
  
  return {
    ...result,
    user: userEvent.setup(),
    rerender: (newUi) => 
      result.rerender(
        <MockAuthProvider user={user} profile={profile}>
          {newUi}
        </MockAuthProvider>
      ),
  }
}

// Customization-specific test utilities
export const CustomizationTestUtils = {
  /**
   * Get all form inputs in a section
   */
  getFormInputs(container) {
    return {
      textInputs: container.querySelectorAll('input[type="text"]'),
      numberInputs: container.querySelectorAll('input[type="number"]'),
      textareas: container.querySelectorAll('textarea'),
      selects: container.querySelectorAll('select'),
      checkboxes: container.querySelectorAll('input[type="checkbox"]'),
      radios: container.querySelectorAll('input[type="radio"]'),
    }
  },

  /**
   * Fill out profile form
   */
  async fillProfileForm(user, data = {}) {
    const defaultData = {
      full_name: 'John Smith',
      bio: 'Professional barber with 5 years of experience',
      phone: '+1234567890',
      instagram_handle: '@johnbarber',
      years_experience: '5',
    }

    const formData = { ...defaultData, ...data }

    for (const [field, value] of Object.entries(formData)) {
      const input = screen.queryByTestId(`profile-${field}`)
      if (input) {
        await user.clear(input)
        await user.type(input, value)
      }
    }
  },

  /**
   * Test image upload workflow
   */
  async testImageUpload(user, fileName = 'test-image.jpg') {
    const file = new File(['test'], fileName, { type: 'image/jpeg' })
    const input = screen.getByTestId('image-upload-input')
    
    await user.upload(input, file)
    
    return { file, input }
  },

  /**
   * Test form validation
   */
  async triggerFormValidation(user, submitButtonTestId = 'submit-button') {
    const submitButton = screen.getByTestId(submitButtonTestId)
    await user.click(submitButton)
  },

  /**
   * Check for unsaved changes indicator
   */
  expectUnsavedChanges(shouldHaveChanges = true) {
    const indicator = screen.queryByText(/unsaved/i)
    if (shouldHaveChanges) {
      expect(indicator).toBeInTheDocument()
    } else {
      expect(indicator).not.toBeInTheDocument()
    }
  },

  /**
   * Test auto-save functionality
   */
  async testAutoSave(user) {
    // Make a change
    const input = screen.getByTestId('profile-full_name')
    await user.clear(input)
    await user.type(input, 'Auto Save Test')

    // Wait for auto-save
    jest.advanceTimersByTime(6000) // Auto-save timer is 5s + buffer
    
    // Check for auto-saving indicator
    expect(screen.queryByText(/saving/i)).toBeInTheDocument()
  },

  /**
   * Test responsive preview modes
   */
  async testPreviewModes(user) {
    const desktopButton = screen.getByTestId('preview-desktop')
    const mobileButton = screen.getByTestId('preview-mobile')

    await user.click(mobileButton)
    expect(screen.getByTestId('preview-container')).toHaveClass('mobile-preview')

    await user.click(desktopButton)
    expect(screen.getByTestId('preview-container')).toHaveClass('desktop-preview')
  },
}

// Accessibility testing utilities
export const A11yTestUtils = {
  /**
   * Test keyboard navigation through form
   */
  async testKeyboardNavigation(user, expectedFields = []) {
    for (const fieldTestId of expectedFields) {
      await user.tab()
      const field = screen.getByTestId(fieldTestId)
      expect(field).toHaveFocus()
    }
  },

  /**
   * Test ARIA labels and roles
   */
  testARIACompliance(container) {
    // Check all form inputs have labels
    const inputs = container.querySelectorAll('input, textarea, select')
    inputs.forEach(input => {
      const label = container.querySelector(`label[for="${input.id}"]`) ||
                   container.querySelector(`[aria-labelledby="${input.getAttribute('aria-labelledby')}"]`)
      
      expect(label || input.getAttribute('aria-label')).toBeTruthy()
    })

    // Check buttons have accessible names
    const buttons = container.querySelectorAll('button')
    buttons.forEach(button => {
      expect(button.textContent || button.getAttribute('aria-label')).toBeTruthy()
    })
  },

  /**
   * Test screen reader announcements
   */
  expectScreenReaderAnnouncement(text) {
    const announcement = screen.queryByRole('status') || screen.queryByRole('alert')
    if (text) {
      expect(announcement).toHaveTextContent(text)
    } else {
      expect(announcement).toBeInTheDocument()
    }
  },
}

// Performance testing utilities
export const PerformanceTestUtils = {
  /**
   * Measure component render time
   */
  async measureRenderTime(Component, props = {}) {
    const start = performance.now()
    render(<Component {...props} />)
    const end = performance.now()
    return end - start
  },

  /**
   * Test with large data sets
   */
  generateLargeDataset(size = 1000) {
    return Array.from({ length: size }, (_, index) => ({
      id: `item-${index}`,
      name: `Item ${index}`,
      value: Math.random() * 100,
    }))
  },

  /**
   * Test memory usage
   */
  measureMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
      }
    }
    return null
  },
}

// Visual regression testing utilities
export const VisualTestUtils = {
  /**
   * Take component snapshot
   */
  takeSnapshot(component, name) {
    expect(component).toMatchSnapshot(name)
  },

  /**
   * Test all component states
   */
  async testAllStates(Component, props = {}) {
    const states = ['default', 'loading', 'error', 'success', 'disabled']
    const snapshots = {}

    for (const state of states) {
      const stateProps = { ...props, [state]: state !== 'default' }
      const { container } = render(<Component {...stateProps} />)
      snapshots[state] = container.innerHTML
    }

    return snapshots
  },
}

// Mock implementations for common hooks
export const mockUseCustomizationForm = (overrides = {}) => ({
  values: {},
  errors: {},
  touched: {},
  isValid: true,
  isSubmitting: false,
  handleChange: jest.fn(),
  handleBlur: jest.fn(),
  handleSubmit: jest.fn(),
  setFieldValue: jest.fn(),
  setFieldError: jest.fn(),
  resetForm: jest.fn(),
  ...overrides,
})

export const mockUseImageUpload = (overrides = {}) => ({
  uploadImage: jest.fn().mockResolvedValue({ url: 'https://test.com/image.jpg' }),
  uploading: false,
  progress: 0,
  error: null,
  ...overrides,
})

export const mockUseDebounce = (value, delay) => value

// Export everything needed for testing
export * from '@testing-library/react'
export { render, screen, mockRouter, mockSupabaseClient }
export { 
  createTestUser, 
  createTestProfile, 
  createTestShop,
  CustomizationTestUtils,
  A11yTestUtils,
  PerformanceTestUtils,
  VisualTestUtils,
  mockUseCustomizationForm,
  mockUseImageUpload,
  mockUseDebounce,
}