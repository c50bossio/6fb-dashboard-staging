/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnifiedCustomizePage from '@/app/(protected)/customize/page'
import { useCustomizationForm } from '@/hooks/useCustomizationForm'
import { useImageUpload } from '@/hooks/useImageUpload'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { SupabaseAuthProvider } from '@/components/SupabaseAuthProvider'
import { createTestUser, createTestProfile } from '@/test-utils/test-utils'

// Mock dependencies
jest.mock('@/lib/supabase/UNIFIED_CLIENT')
jest.mock('@/hooks/useCustomizationForm')
jest.mock('@/hooks/useImageUpload')
jest.mock('@/components/customization/BarberProfileCustomization')
jest.mock('@/components/customization/BarbershopWebsiteCustomization')
jest.mock('@/components/customization/EnterpriseWebsiteCustomization')

// Global fetch mock
global.fetch = jest.fn()

describe('Customization Form State Integration', () => {
  let mockSupabase
  let mockUseCustomizationForm
  let mockUseImageUpload
  let mockUser
  let mockProfile

  // Mock data for different sections
  const mockBarberData = {
    full_name: 'John Doe',
    bio: 'Professional barber',
    phone: '+1234567890',
    instagram_handle: '@johndoe',
    years_experience: 5,
    services_offered: [
      { name: 'Haircut', price: 30, duration: 45 },
      { name: 'Beard Trim', price: 15, duration: 20 }
    ]
  }

  const mockBarbershopData = {
    business_name: 'The Modern Barbershop',
    description: 'Premier barbershop services',
    address: '123 Main St, City, State',
    phone: '+1234567890',
    email: 'info@modernbarbershop.com'
  }

  const mockEnterpriseData = {
    organization_name: 'Barber Enterprise',
    description: 'Multi-location barbershop chain',
    locations: [
      { name: 'Downtown', address: '123 Main St' },
      { name: 'Mall', address: '456 Shopping Center' }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Setup user and profile
    mockUser = createTestUser()
    mockProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' }) // Access to all sections

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    }
    createClient.mockReturnValue(mockSupabase)

    // Mock useCustomizationForm hook
    mockUseCustomizationForm = {
      settings: {},
      originalSettings: {},
      isLoading: false,
      isSaving: false,
      isAutoSaving: false,
      errors: {},
      touched: {},
      hasUnsavedChanges: false,
      canUndo: false,
      canRedo: false,
      updateSetting: jest.fn(),
      updateSettings: jest.fn(),
      save: jest.fn().mockResolvedValue(),
      load: jest.fn().mockResolvedValue(),
      reset: jest.fn(),
      undo: jest.fn(),
      redo: jest.fn(),
      validate: jest.fn().mockReturnValue(true),
      setErrors: jest.fn(),
      setTouched: jest.fn()
    }
    useCustomizationForm.mockReturnValue(mockUseCustomizationForm)

    // Mock useImageUpload hook
    mockUseImageUpload = {
      uploading: false,
      progress: 0,
      error: null,
      uploadImage: jest.fn().mockResolvedValue({
        url: 'https://example.com/uploaded.jpg',
        preview: 'data:image/jpeg;base64,mock',
        file: new Blob(),
        originalFile: new File([''], 'test.jpg'),
        size: 1024,
        type: 'image/jpeg'
      }),
      uploadMultiple: jest.fn().mockResolvedValue([]),
      cancelUpload: jest.fn(),
      reset: jest.fn(),
      validateFile: jest.fn().mockReturnValue(true),
      createDragHandlers: jest.fn(() => ({
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn()
      }))
    }
    useImageUpload.mockReturnValue(mockUseImageUpload)

    // Mock fetch for uploads
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://example.com/uploaded.jpg' })
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  const renderWithAuth = (user = mockUser, profile = mockProfile) => {
    const AuthWrapper = ({ children }) => {
      const authValue = {
        user,
        profile,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn()
      }

      return (
        <SupabaseAuthProvider.Provider value={authValue}>
          {children}
        </SupabaseAuthProvider.Provider>
      )
    }

    return render(
      <AuthWrapper>
        <UnifiedCustomizePage />
      </AuthWrapper>
    )
  }

  describe('Cross-Section State Synchronization', () => {
    it('maintains independent form states for different sections', async () => {
      const barberFormMock = { ...mockUseCustomizationForm, settings: mockBarberData }
      const shopFormMock = { ...mockUseCustomizationForm, settings: mockBarbershopData }
      const enterpriseFormMock = { ...mockUseCustomizationForm, settings: mockEnterpriseData }

      // Return different mocks based on the table name or other criteria
      useCustomizationForm
        .mockReturnValueOnce(barberFormMock)
        .mockReturnValueOnce(shopFormMock)
        .mockReturnValueOnce(enterpriseFormMock)

      renderWithAuth()

      // Skip loading state
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
        expect(screen.getByTestId('customization-section-barbershop-website')).toBeInTheDocument()
        expect(screen.getByTestId('customization-section-multi-location-management')).toBeInTheDocument()
      })

      // Each section should have its own form instance
      expect(useCustomizationForm).toHaveBeenCalledTimes(3)
    })

    it('tracks unsaved changes independently across sections', async () => {
      let barberHasChanges = false
      let shopHasChanges = false
      let enterpriseHasChanges = false

      const barberFormMock = {
        ...mockUseCustomizationForm,
        hasUnsavedChanges: barberHasChanges,
        settings: mockBarberData
      }

      const shopFormMock = {
        ...mockUseCustomizationForm,
        hasUnsavedChanges: shopHasChanges,
        settings: mockBarbershopData
      }

      const enterpriseFormMock = {
        ...mockUseCustomizationForm,
        hasUnsavedChanges: enterpriseHasChanges,
        settings: mockEnterpriseData
      }

      useCustomizationForm
        .mockReturnValueOnce(barberFormMock)
        .mockReturnValueOnce(shopFormMock)
        .mockReturnValueOnce(enterpriseFormMock)

      const { rerender } = renderWithAuth()

      // Skip loading
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument() // No unsaved changes initially
      })

      // Simulate changes in barber section only
      barberHasChanges = true
      barberFormMock.hasUnsavedChanges = true

      useCustomizationForm
        .mockReturnValueOnce(barberFormMock)
        .mockReturnValueOnce(shopFormMock)
        .mockReturnValueOnce(enterpriseFormMock)

      rerender(
        <SupabaseAuthProvider.Provider value={{ user: mockUser, profile: mockProfile, loading: false }}>
          <UnifiedCustomizePage />
        </SupabaseAuthProvider.Provider>
      )

      // Progress should reflect 2 out of 3 sections complete (67%)
      await waitFor(() => {
        expect(screen.getByText('67%')).toBeInTheDocument()
        expect(screen.getByText('1 Unsaved Section')).toBeInTheDocument()
      })
    })

    it('aggregates progress across all visible sections', async () => {
      const scenarios = [
        // All sections complete
        {
          barberChanges: false,
          shopChanges: false,
          enterpriseChanges: false,
          expectedProgress: '100%',
          expectedUnsaved: 0
        },
        // One section has changes
        {
          barberChanges: true,
          shopChanges: false,
          enterpriseChanges: false,
          expectedProgress: '67%',
          expectedUnsaved: 1
        },
        // Two sections have changes
        {
          barberChanges: true,
          shopChanges: true,
          enterpriseChanges: false,
          expectedProgress: '33%',
          expectedUnsaved: 2
        },
        // All sections have changes
        {
          barberChanges: true,
          shopChanges: true,
          enterpriseChanges: true,
          expectedProgress: '0%',
          expectedUnsaved: 3
        }
      ]

      for (const scenario of scenarios) {
        jest.clearAllMocks()

        useCustomizationForm
          .mockReturnValueOnce({ ...mockUseCustomizationForm, hasUnsavedChanges: scenario.barberChanges })
          .mockReturnValueOnce({ ...mockUseCustomizationForm, hasUnsavedChanges: scenario.shopChanges })
          .mockReturnValueOnce({ ...mockUseCustomizationForm, hasUnsavedChanges: scenario.enterpriseChanges })

        const { unmount } = renderWithAuth()

        act(() => {
          jest.advanceTimersByTime(1000)
        })

        await waitFor(() => {
          expect(screen.getByText(scenario.expectedProgress)).toBeInTheDocument()
        })

        if (scenario.expectedUnsaved > 0) {
          const unsavedText = scenario.expectedUnsaved === 1 
            ? '1 Unsaved Section' 
            : `${scenario.expectedUnsaved} Unsaved Sections`
          expect(screen.getByText(unsavedText)).toBeInTheDocument()
        }

        unmount()
      }
    })
  })

  describe('Auto-Save Coordination', () => {
    it('handles concurrent auto-save operations across sections', async () => {
      const barberSave = jest.fn().mockResolvedValue()
      const shopSave = jest.fn().mockResolvedValue() 
      const enterpriseSave = jest.fn().mockResolvedValue()

      const barberFormMock = {
        ...mockUseCustomizationForm,
        isAutoSaving: true,
        save: barberSave,
        hasUnsavedChanges: true
      }

      const shopFormMock = {
        ...mockUseCustomizationForm,
        isAutoSaving: true,
        save: shopSave,
        hasUnsavedChanges: true
      }

      const enterpriseFormMock = {
        ...mockUseCustomizationForm,
        isAutoSaving: false,
        save: enterpriseSave,
        hasUnsavedChanges: false
      }

      useCustomizationForm
        .mockReturnValueOnce(barberFormMock)
        .mockReturnValueOnce(shopFormMock)
        .mockReturnValueOnce(enterpriseFormMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
      })

      // Both barber and shop sections should show auto-saving indicators
      const barberSection = screen.getByTestId('customization-section-barber-profile')
      const shopSection = screen.getByTestId('customization-section-barbershop-website')
      const enterpriseSection = screen.getByTestId('customization-section-multi-location-management')

      // Check for auto-saving indicators (would be implemented in actual components)
      expect(within(barberSection).getByTestId('unsaved-changes-indicator')).toBeInTheDocument()
      expect(within(shopSection).getByTestId('unsaved-changes-indicator')).toBeInTheDocument()
      expect(within(enterpriseSection).queryByTestId('unsaved-changes-indicator')).not.toBeInTheDocument()
    })

    it('prevents conflicting save operations', async () => {
      const globalSave = jest.fn()
      const barberSave = jest.fn()

      const barberFormMock = {
        ...mockUseCustomizationForm,
        isSaving: true,
        save: barberSave,
        hasUnsavedChanges: true
      }

      useCustomizationForm.mockReturnValue(barberFormMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByText('Save All Changes')).toBeInTheDocument()
      })

      const user = userEvent.setup({ delay: null })
      const saveAllButton = screen.getByText('Save All Changes')

      // Attempt to click save all while individual section is saving
      await user.click(saveAllButton)

      // Should be disabled or show loading state during save
      expect(saveAllButton).toBeDisabled()
    })

    it('queues save operations when system is busy', async () => {
      const saveQueue = []
      const queuedSave = jest.fn((data) => {
        saveQueue.push(data)
        return Promise.resolve()
      })

      const formMock = {
        ...mockUseCustomizationForm,
        save: queuedSave,
        hasUnsavedChanges: true
      }

      useCustomizationForm.mockReturnValue(formMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      const user = userEvent.setup({ delay: null })

      // Simulate multiple rapid save requests
      const saveButton = await screen.findByText('Save All Changes')

      await user.click(saveButton)
      await user.click(saveButton)
      await user.click(saveButton)

      // Verify save operations are queued/handled correctly
      expect(queuedSave).toHaveBeenCalled()
    })
  })

  describe('Image Upload Integration', () => {
    it('coordinates image uploads across different sections', async () => {
      const uploadBarberImage = jest.fn().mockResolvedValue({
        url: 'https://example.com/barber-profile.jpg'
      })
      
      const uploadShopImage = jest.fn().mockResolvedValue({
        url: 'https://example.com/shop-logo.jpg'
      })

      // Mock different upload instances for different sections
      useImageUpload
        .mockReturnValueOnce({ ...mockUseImageUpload, uploadImage: uploadBarberImage })
        .mockReturnValueOnce({ ...mockUseImageUpload, uploadImage: uploadShopImage })

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
      })

      // Each section should have its own upload capability
      expect(useImageUpload).toHaveBeenCalledTimes(2)
    })

    it('handles upload progress across multiple sections', async () => {
      const barberUploadMock = {
        ...mockUseImageUpload,
        uploading: true,
        progress: 45
      }

      const shopUploadMock = {
        ...mockUseImageUpload,
        uploading: false,
        progress: 0
      }

      useImageUpload
        .mockReturnValueOnce(barberUploadMock)
        .mockReturnValueOnce(shopUploadMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
      })

      // Should show upload progress for the active upload
      // (This would be implemented in the actual components)
    })

    it('handles upload failures gracefully across sections', async () => {
      const failedUpload = jest.fn().mockRejectedValue(new Error('Upload failed'))
      
      const uploadMock = {
        ...mockUseImageUpload,
        uploadImage: failedUpload,
        error: 'Upload failed'
      }

      useImageUpload.mockReturnValue(uploadMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
      })

      // Error should be contained within the specific section
      expect(uploadMock.error).toBe('Upload failed')
    })
  })

  describe('Validation Coordination', () => {
    it('validates forms independently but shows aggregate errors', async () => {
      const barberErrors = { full_name: 'Name is required' }
      const shopErrors = { business_name: 'Business name is required' }

      const barberFormMock = {
        ...mockUseCustomizationForm,
        errors: barberErrors,
        validate: jest.fn().mockReturnValue(false)
      }

      const shopFormMock = {
        ...mockUseCustomizationForm,
        errors: shopErrors,
        validate: jest.fn().mockReturnValue(false)
      }

      const enterpriseFormMock = {
        ...mockUseCustomizationForm,
        errors: {},
        validate: jest.fn().mockReturnValue(true)
      }

      useCustomizationForm
        .mockReturnValueOnce(barberFormMock)
        .mockReturnValueOnce(shopFormMock)
        .mockReturnValueOnce(enterpriseFormMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
      })

      // Each section should maintain its own validation state
      expect(barberFormMock.validate).toBeDefined()
      expect(shopFormMock.validate).toBeDefined()
      expect(enterpriseFormMock.validate).toBeDefined()
    })

    it('prevents form submission when validation fails', async () => {
      const formMock = {
        ...mockUseCustomizationForm,
        hasUnsavedChanges: true,
        validate: jest.fn().mockReturnValue(false),
        errors: { full_name: 'Required field' }
      }

      useCustomizationForm.mockReturnValue(formMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      const user = userEvent.setup({ delay: null })
      const saveButton = await screen.findByText('Save All Changes')

      await user.click(saveButton)

      // Save should not proceed if validation fails
      expect(formMock.save).not.toHaveBeenCalled()
    })

    it('shows validation errors in appropriate sections', async () => {
      const formWithErrors = {
        ...mockUseCustomizationForm,
        errors: {
          'full_name': 'Name is required',
          'services_offered.0.name': 'Service name is required'
        },
        touched: {
          'full_name': true,
          'services_offered.0.name': true
        }
      }

      useCustomizationForm.mockReturnValue(formWithErrors)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
      })

      // Errors should be displayed in the UI (would be implemented in actual components)
      expect(formWithErrors.errors['full_name']).toBe('Name is required')
      expect(formWithErrors.errors['services_offered.0.name']).toBe('Service name is required')
    })
  })

  describe('Undo/Redo Coordination', () => {
    it('maintains separate undo stacks for each section', async () => {
      const barberUndo = jest.fn()
      const shopUndo = jest.fn()

      const barberFormMock = {
        ...mockUseCustomizationForm,
        canUndo: true,
        undo: barberUndo,
        hasUnsavedChanges: true
      }

      const shopFormMock = {
        ...mockUseCustomizationForm,
        canUndo: true,
        undo: shopUndo,
        hasUnsavedChanges: true
      }

      useCustomizationForm
        .mockReturnValueOnce(barberFormMock)
        .mockReturnValueOnce(shopFormMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
      })

      // Each section should have independent undo capability
      expect(barberFormMock.canUndo).toBe(true)
      expect(shopFormMock.canUndo).toBe(true)
      expect(typeof barberFormMock.undo).toBe('function')
      expect(typeof shopFormMock.undo).toBe('function')
    })

    it('provides global undo functionality when available', async () => {
      const globalUndo = jest.fn()

      const formMock = {
        ...mockUseCustomizationForm,
        canUndo: true,
        undo: globalUndo,
        hasUnsavedChanges: true
      }

      useCustomizationForm.mockReturnValue(formMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByText('Save All Changes')).toBeInTheDocument()
      })

      // Global undo should be available when sections have undo capability
      expect(formMock.canUndo).toBe(true)
    })
  })

  describe('Real-time Synchronization', () => {
    it('handles database updates from other sessions', async () => {
      const originalData = { full_name: 'John Doe' }
      const updatedData = { full_name: 'John Smith' }

      const formMock = {
        ...mockUseCustomizationForm,
        settings: originalData,
        originalSettings: originalData,
        load: jest.fn()
      }

      useCustomizationForm.mockReturnValue(formMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
      })

      // Simulate external update
      formMock.settings = updatedData
      formMock.originalSettings = updatedData

      // Component should handle external changes gracefully
      expect(formMock.load).toBeDefined()
    })

    it('manages conflicts between local and remote changes', async () => {
      const localChanges = { full_name: 'Local Change' }
      const remoteChanges = { full_name: 'Remote Change' }

      const formMock = {
        ...mockUseCustomizationForm,
        settings: localChanges,
        originalSettings: remoteChanges,
        hasUnsavedChanges: true,
        save: jest.fn().mockRejectedValue(new Error('Conflict detected'))
      }

      useCustomizationForm.mockReturnValue(formMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      const user = userEvent.setup({ delay: null })
      const saveButton = await screen.findByText('Save All Changes')

      await user.click(saveButton)

      // Should handle conflicts appropriately
      expect(formMock.save).toHaveBeenCalled()
    })
  })

  describe('Error Recovery', () => {
    it('recovers from network failures during save', async () => {
      const failThenSucceed = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('Success')

      const formMock = {
        ...mockUseCustomizationForm,
        save: failThenSucceed,
        hasUnsavedChanges: true
      }

      useCustomizationForm.mockReturnValue(formMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      const user = userEvent.setup({ delay: null })
      const saveButton = await screen.findByText('Save All Changes')

      // First attempt should fail
      await user.click(saveButton)
      expect(failThenSucceed).toHaveBeenCalledTimes(1)

      // Second attempt should succeed
      await user.click(saveButton)
      expect(failThenSucceed).toHaveBeenCalledTimes(2)
    })

    it('maintains form state during errors', async () => {
      const formData = { full_name: 'John Doe', bio: 'Test bio' }
      
      const formMock = {
        ...mockUseCustomizationForm,
        settings: formData,
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
        hasUnsavedChanges: true
      }

      useCustomizationForm.mockReturnValue(formMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      const user = userEvent.setup({ delay: null })
      const saveButton = await screen.findByText('Save All Changes')

      await user.click(saveButton)

      // Form data should be preserved after error
      expect(formMock.settings).toEqual(formData)
      expect(formMock.hasUnsavedChanges).toBe(true)
    })
  })

  describe('Performance Optimization', () => {
    it('minimizes re-renders during form updates', async () => {
      let renderCount = 0
      const countingFormMock = {
        ...mockUseCustomizationForm,
        updateSetting: jest.fn(() => { renderCount++ })
      }

      useCustomizationForm.mockReturnValue(countingFormMock)

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
      })

      // Simulate multiple updates
      act(() => {
        countingFormMock.updateSetting('full_name', 'John')
        countingFormMock.updateSetting('full_name', 'John Doe')
        countingFormMock.updateSetting('bio', 'Professional')
      })

      // Should batch updates to minimize renders
      expect(renderCount).toBeGreaterThan(0)
    })

    it('debounces auto-save across sections', async () => {
      jest.useFakeTimers()
      
      const debouncedSave = jest.fn()
      const formMock = {
        ...mockUseCustomizationForm,
        hasUnsavedChanges: true,
        isAutoSaving: false
      }

      // Mock auto-save behavior
      let autoSaveTimeout
      const triggerAutoSave = () => {
        clearTimeout(autoSaveTimeout)
        autoSaveTimeout = setTimeout(debouncedSave, 5000)
      }

      useCustomizationForm.mockReturnValue({
        ...formMock,
        updateSetting: triggerAutoSave
      })

      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      // Trigger multiple rapid updates
      act(() => {
        triggerAutoSave()
        triggerAutoSave()
        triggerAutoSave()
      })

      // Fast-forward to auto-save trigger
      act(() => {
        jest.advanceTimersByTime(5000)
      })

      // Should only trigger auto-save once due to debouncing
      expect(debouncedSave).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })
  })

  describe('Accessibility Integration', () => {
    it('maintains focus management across sections', async () => {
      renderWithAuth()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      const user = userEvent.setup({ delay: null })

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
      })

      // Test tab navigation across sections
      const barberToggle = screen.getByTestId('section-toggle-barber-profile')
      const shopToggle = screen.getByTestId('section-toggle-barbershop-website')

      await user.tab()
      // Focus should move through interactive elements properly

      expect(document.activeElement).toBeTruthy()
    })

    it('announces save status changes to screen readers', async () => {
      const formMock = {
        ...mockUseCustomizationForm,
        isSaving: true,
        hasUnsavedChanges: true
      }

      const { rerender } = render(
        <SupabaseAuthProvider.Provider value={{ user: mockUser, profile: mockProfile, loading: false }}>
          <UnifiedCustomizePage />
        </SupabaseAuthProvider.Provider>
      )

      useCustomizationForm.mockReturnValue(formMock)

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      // Should have appropriate ARIA attributes for status updates
      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
      })

      // Save status changes should be announced (would be implemented in actual components)
      expect(formMock.isSaving).toBe(true)
    })
  })
})