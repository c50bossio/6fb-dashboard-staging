/**
 * INTEGRATION TESTS FOR SETTINGS FORM WORKFLOW
 * 
 * Tests the complete Edit/Save/Cancel workflow with NuclearInput integration
 * Covers state management, API interactions, and form validation
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import SettingsPage from '../../app/dashboard/settings/page'

// Mock dynamic imports for charts and icons
jest.mock('next/dynamic', () => {
  return (importFunc) => {
    const ComponentMock = (props) => <div data-testid="mocked-component" {...props} />
    ComponentMock.displayName = 'MockedDynamicComponent'
    return ComponentMock
  }
})

// Mock localStorage
const LocalStorage = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  removeItem: jest.fn()
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock window location for hash handling
delete window.location
window.location = {
  hash: '',
  assign: jest.fn(),
  reload: jest.fn()
}

describe('Settings Form Integration Tests', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    jest.clearAllMocks()
    
    // Default successful API responses
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        barbershop: {
          name: 'Test Barbershop',
          address: '123 Test St',
          phone: '+1 (555) 123-4567',
          email: 'test@barbershop.com',
          timezone: 'America/New_York'
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          campaignAlerts: true,
          bookingAlerts: true,
          systemAlerts: true
        }
      })
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Initial Form Load and State', () => {
    test('loads initial settings data from API', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      expect(fetch).toHaveBeenCalledWith('/api/v1/settings/barbershop', {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })
      
      expect(fetch).toHaveBeenCalledWith('/api/v1/settings/business-hours', {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })
    })

    test('displays loaded data in form fields', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Barbershop')).toBeInTheDocument()
        expect(screen.getByText('+1 (555) 123-4567')).toBeInTheDocument()
        expect(screen.getByText('test@barbershop.com')).toBeInTheDocument()
      })
    })

    test('handles API loading errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('API Error'))
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load settings:', expect.any(Error))
      })
      
      consoleSpy.mockRestore()
    })
  })

  describe('Edit Mode Activation and UI Changes', () => {
    test('enters edit mode when Edit button is clicked', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      // Should show Save and Cancel buttons
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      
      // Edit button should be hidden
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    })

    test('shows form inputs in edit mode', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      // Phone and email should become NuclearInput fields
      const phoneInput = screen.getByPlaceholderText('Enter phone number')
      const emailInput = screen.getByPlaceholderText('Enter email address')
      
      expect(phoneInput).toBeInTheDocument()
      expect(emailInput).toBeInTheDocument()
      expect(phoneInput.tagName).toBe('INPUT')
      expect(emailInput.tagName).toBe('INPUT')
    })

    test('applies visual focus styling in edit mode', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      // Card should have edit mode styling
      const editableCard = screen.getByRole('button', { name: /edit/i }).closest('.card')
      expect(editableCard).toHaveClass('ring-2', 'ring-blue-500', 'ring-opacity-50')
    })
  })

  describe('NuclearInput Integration in Settings Form', () => {
    test('phone field uses NuclearInput with proper blur handling', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      const phoneInput = screen.getByPlaceholderText('Enter phone number')
      
      // Type in phone field
      await user.type(phoneInput, '+1 (555) 999-8888')
      expect(phoneInput.value).toBe('+1 (555) 999-8888')
      
      // Focus should remain during typing
      expect(phoneInput).toHaveFocus()
      
      // Move focus away to trigger blur
      const emailInput = screen.getByPlaceholderText('Enter email address')
      await user.click(emailInput)
      
      // Phone input should no longer have focus
      expect(phoneInput).not.toHaveFocus()
    })

    test('email field uses NuclearInput with proper validation', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      const emailInput = screen.getByPlaceholderText('Enter email address')
      
      // Type valid email
      await user.type(emailInput, 'newemail@test.com')
      expect(emailInput.value).toBe('newemail@test.com')
      
      // Type and test special characters
      await user.clear(emailInput)
      await user.type(emailInput, 'test+tag@domain.co.uk')
      expect(emailInput.value).toBe('test+tag@domain.co.uk')
    })

    test('nuclear inputs maintain values during rapid interaction', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      const phoneInput = screen.getByPlaceholderText('Enter phone number')
      const emailInput = screen.getByPlaceholderText('Enter email address')
      
      // Rapid switching between inputs
      await user.type(phoneInput, '555-1234')
      await user.click(emailInput)
      await user.type(emailInput, 'test@')
      await user.click(phoneInput)
      await user.type(phoneInput, '-ext123')
      
      expect(phoneInput.value).toBe('555-1234-ext123')
      expect(emailInput.value).toBe('test@')
    })
  })

  describe('Form Validation and Error Handling', () => {
    test('validates email format on save', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      const emailInput = screen.getByPlaceholderText('Enter email address')
      await user.clear(emailInput)
      await user.type(emailInput, 'invalid-email')
      
      // Trigger blur to update state
      await user.tab()
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument()
      })
      
      // Should still be in edit mode
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })

    test('accepts valid email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user123@test-domain.com'
      ]
      
      for (const email of validEmails) {
        render(<SettingsPage />)
        
        await waitFor(() => {
          expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
        })
        
        const editButton = screen.getByRole('button', { name: /edit/i })
        await user.click(editButton)
        
        const emailInput = screen.getByPlaceholderText('Enter email address')
        await user.clear(emailInput)
        await user.type(emailInput, email)
        await user.tab() // Trigger blur
        
        const saveButton = screen.getByRole('button', { name: /save/i })
        await user.click(saveButton)
        
        // Should not show validation error
        await waitFor(() => {
          expect(screen.queryByText('Invalid email format')).not.toBeInTheDocument()
        })
        
        // Clean up for next iteration
        screen.debug = () => {} // Suppress debug output
      }
    })

    test('displays API error messages', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          detail: 'Email already exists'
        })
      })
      
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      const emailInput = screen.getByPlaceholderText('Enter email address')
      await user.clear(emailInput)
      await user.type(emailInput, 'existing@test.com')
      await user.tab()
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Email already exists/)).toBeInTheDocument()
      })
    })
  })

  describe('Save Operation and API Integration', () => {
    test('sends correct data to API on save', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      // Update form fields
      const phoneInput = screen.getByPlaceholderText('Enter phone number')
      const emailInput = screen.getByPlaceholderText('Enter email address')
      
      await user.clear(phoneInput)
      await user.type(phoneInput, '+1 (555) 123-9999')
      await user.tab() // Trigger blur
      
      await user.clear(emailInput)
      await user.type(emailInput, 'updated@test.com')
      await user.tab() // Trigger blur
      
      // Mock successful save response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/v1/settings/barbershop', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify({
            name: 'Test Barbershop',
            address: '123 Test St',
            phone: '+1 (555) 123-9999',
            email: 'updated@test.com',
            timezone: 'America/New_York'
          })
        })
      })
    })

    test('shows success message after successful save', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument()
      })
      
      // Should exit edit mode
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    test('shows loading state during save operation', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      // Create a promise that we can control
      let resolvePromise
      const savePromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      
      fetch.mockReturnValueOnce(savePromise)
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)
      
      // Should show loading state
      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
      
      // Resolve the promise
      resolvePromise({
        ok: true,
        json: async () => ({})
      })
      
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Cancel Operation and State Reset', () => {
    test('exits edit mode on cancel', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    test('clears error messages on cancel', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      // Create an error by entering invalid email
      const emailInput = screen.getByPlaceholderText('Enter email address')
      await user.clear(emailInput)
      await user.type(emailInput, 'invalid-email')
      await user.tab()
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument()
      })
      
      // Cancel should clear the error
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(screen.queryByText('Invalid email format')).not.toBeInTheDocument()
    })

    test('does not save changes on cancel', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      // Make changes
      const phoneInput = screen.getByPlaceholderText('Enter phone number')
      await user.clear(phoneInput)
      await user.type(phoneInput, 'modified phone')
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      // Should not call save API
      expect(fetch).not.toHaveBeenCalledWith(
        '/api/v1/settings/barbershop',
        expect.objectContaining({ method: 'PUT' })
      )
    })
  })

  describe('Complex Workflow Scenarios', () => {
    test('handles multiple edit/save/cancel cycles', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      // First cycle - edit and save
      let editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      
      let saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      })
      
      // Second cycle - edit and cancel
      editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      
      // Third cycle - edit and save again
      editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      
      saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      })
    })

    test('handles simultaneous field updates correctly', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      const phoneInput = screen.getByPlaceholderText('Enter phone number')
      const emailInput = screen.getByPlaceholderText('Enter email address')
      
      // Update both fields simultaneously
      await act(async () => {
        await user.clear(phoneInput)
        await user.clear(emailInput)
      })
      
      await act(async () => {
        await user.type(phoneInput, '+1 (555) 777-8888')
        await user.type(emailInput, 'simultaneous@test.com')
      })
      
      // Blur both to update state
      await user.tab()
      await user.tab()
      
      fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/v1/settings/barbershop', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify(expect.objectContaining({
            phone: '+1 (555) 777-8888',
            email: 'simultaneous@test.com'
          }))
        })
      })
    })
  })

  describe('Timezone Integration', () => {
    test('timezone dropdown works in edit mode', async () => {
      render(<SettingsPage />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading Settings...')).not.toBeInTheDocument()
      })
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      const timezoneSelect = screen.getByDisplayValue('Eastern Time')
      await user.selectOptions(timezoneSelect, 'America/Los_Angeles')
      
      expect(timezoneSelect.value).toBe('America/Los_Angeles')
      
      fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/v1/settings/barbershop', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify(expect.objectContaining({
            timezone: 'America/Los_Angeles'
          }))
        })
      })
    })
  })
})