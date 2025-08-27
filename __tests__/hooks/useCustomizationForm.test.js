/**
 * @jest-environment jsdom
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCustomizationForm } from '@/hooks/useCustomizationForm'
import { createClient } from '@/lib/supabase/client'
import { SupabaseAuthProvider } from '@/components/SupabaseAuthProvider'
import { createTestUser } from '@/test-utils/test-utils'

// Mock Supabase client
jest.mock('@/lib/supabase/client')

// Mock SupabaseAuthProvider
const MockAuthProvider = ({ children, user = createTestUser() }) => {
  const authContextValue = {
    user,
    profile: { id: user.id, role: 'SHOP_OWNER' },
    loading: false
  }
  
  return (
    <SupabaseAuthProvider.Provider value={authContextValue}>
      {children}
    </SupabaseAuthProvider.Provider>
  )
}

describe('useCustomizationForm Hook', () => {
  let mockSupabase
  
  const initialSettings = {
    full_name: 'John Doe',
    bio: 'Professional barber',
    phone: '+1234567890',
    services: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }
    createClient.mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  const renderHookWithAuth = (initialData = initialSettings, options = {}) => {
    const wrapper = ({ children }) => (
      <MockAuthProvider>
        {children}
      </MockAuthProvider>
    )
    return renderHook(() => useCustomizationForm(initialData, options), { wrapper })
  }

  describe('Basic Form State Management', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHookWithAuth()

      expect(result.current.settings).toEqual(initialSettings)
      expect(result.current.originalSettings).toEqual(initialSettings)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSaving).toBe(false)
      expect(result.current.isAutoSaving).toBe(false)
      expect(result.current.errors).toEqual({})
      expect(result.current.touched).toEqual({})
      expect(result.current.hasUnsavedChanges).toBe(false)
    })

    it('updates single settings correctly', () => {
      const { result } = renderHookWithAuth()

      act(() => {
        result.current.updateSetting('full_name', 'Jane Smith')
      })

      expect(result.current.settings.full_name).toBe('Jane Smith')
      expect(result.current.hasUnsavedChanges).toBe(true)
      expect(result.current.touched.full_name).toBe(true)
    })

    it('handles nested object updates', () => {
      const { result } = renderHookWithAuth()

      act(() => {
        result.current.updateSetting('social_links.instagram', '@johndoe')
      })

      expect(result.current.settings.social_links?.instagram).toBe('@johndoe')
      expect(result.current.hasUnsavedChanges).toBe(true)
    })

    it('updates multiple settings in batch', () => {
      const { result } = renderHookWithAuth()

      act(() => {
        result.current.updateSettings({
          full_name: 'Jane Smith',
          bio: 'Expert stylist'
        })
      })

      expect(result.current.settings.full_name).toBe('Jane Smith')
      expect(result.current.settings.bio).toBe('Expert stylist')
      expect(result.current.hasUnsavedChanges).toBe(true)
      expect(result.current.touched.full_name).toBe(true)
      expect(result.current.touched.bio).toBe(true)
    })
  })

  describe('Auto-save Functionality', () => {
    it('triggers auto-save after delay', async () => {
      const onSave = jest.fn()
      mockSupabase.update.mockResolvedValue({ error: null })
      
      const { result } = renderHookWithAuth(initialSettings, {
        autoSaveDelay: 1000,
        onSave
      })

      // Make a change
      act(() => {
        result.current.updateSetting('full_name', 'Auto Save Test')
      })

      expect(result.current.isAutoSaving).toBe(false)

      // Fast-forward past auto-save delay
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(mockSupabase.update).toHaveBeenCalled()
      })

      expect(onSave).toHaveBeenCalled()
    })

    it('cancels previous auto-save when new changes occur', async () => {
      mockSupabase.update.mockResolvedValue({ error: null })
      
      const { result } = renderHookWithAuth(initialSettings, {
        autoSaveDelay: 1000
      })

      // First change
      act(() => {
        result.current.updateSetting('full_name', 'First Change')
      })

      // Second change before auto-save triggers
      act(() => {
        jest.advanceTimersByTime(500)
        result.current.updateSetting('full_name', 'Second Change')
      })

      // Fast-forward past original delay
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(mockSupabase.update).toHaveBeenCalledTimes(1)
      })

      // Should save with the latest value
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Second Change'
        })
      )
    })

    it('handles auto-save errors gracefully', async () => {
      const onError = jest.fn()
      mockSupabase.update.mockResolvedValue({ error: new Error('Network error') })
      
      const { result } = renderHookWithAuth(initialSettings, {
        autoSaveDelay: 500,
        onError
      })

      act(() => {
        result.current.updateSetting('full_name', 'Error Test')
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
        expect(result.current.isAutoSaving).toBe(false)
      })
    })

    it('does not auto-save when user is not authenticated', () => {
      const wrapper = ({ children }) => (
        <MockAuthProvider user={null}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(
        () => useCustomizationForm(initialSettings, { autoSaveDelay: 500 }),
        { wrapper }
      )

      act(() => {
        result.current.updateSetting('full_name', 'No User Test')
        jest.advanceTimersByTime(500)
      })

      expect(mockSupabase.update).not.toHaveBeenCalled()
    })

    it('shows auto-saving indicator during auto-save', async () => {
      mockSupabase.update.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ error: null }), 200))
      )
      
      const { result } = renderHookWithAuth(initialSettings, {
        autoSaveDelay: 100
      })

      act(() => {
        result.current.updateSetting('full_name', 'Auto Save Indicator Test')
      })

      act(() => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(result.current.isAutoSaving).toBe(true)
      })

      act(() => {
        jest.advanceTimersByTime(200)
      })

      await waitFor(() => {
        expect(result.current.isAutoSaving).toBe(false)
      })
    })
  })

  describe('Undo/Redo Functionality', () => {
    it('tracks changes in undo stack', () => {
      const { result } = renderHookWithAuth()

      act(() => {
        result.current.updateSetting('full_name', 'First Change')
      })

      expect(result.current.canUndo).toBe(true)
      expect(result.current.canRedo).toBe(false)

      act(() => {
        result.current.updateSetting('bio', 'Second Change')
      })

      expect(result.current.canUndo).toBe(true)
    })

    it('performs undo operation correctly', () => {
      const { result } = renderHookWithAuth()

      const originalName = result.current.settings.full_name

      // Make a change
      act(() => {
        result.current.updateSetting('full_name', 'Changed Name')
      })

      expect(result.current.settings.full_name).toBe('Changed Name')

      // Undo the change
      act(() => {
        result.current.undo()
      })

      expect(result.current.settings.full_name).toBe(originalName)
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(true)
    })

    it('performs redo operation correctly', () => {
      const { result } = renderHookWithAuth()

      // Make a change and undo it
      act(() => {
        result.current.updateSetting('full_name', 'Changed Name')
      })

      act(() => {
        result.current.undo()
      })

      expect(result.current.canRedo).toBe(true)

      // Redo the change
      act(() => {
        result.current.redo()
      })

      expect(result.current.settings.full_name).toBe('Changed Name')
      expect(result.current.canRedo).toBe(false)
      expect(result.current.canUndo).toBe(true)
    })

    it('limits undo stack size', () => {
      const { result } = renderHookWithAuth(initialSettings, { maxUndoSteps: 3 })

      // Make more changes than the max stack size
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.updateSetting('full_name', `Change ${i}`)
        })
      }

      // Should only be able to undo 3 times
      let undoCount = 0
      while (result.current.canUndo && undoCount < 10) { // Prevent infinite loop
        act(() => {
          result.current.undo()
        })
        undoCount++
      }

      expect(undoCount).toBe(3)
    })

    it('clears redo stack when new changes are made after undo', () => {
      const { result } = renderHookWithAuth()

      // Make changes
      act(() => {
        result.current.updateSetting('full_name', 'First Change')
      })

      act(() => {
        result.current.updateSetting('bio', 'Second Change')
      })

      // Undo once
      act(() => {
        result.current.undo()
      })

      expect(result.current.canRedo).toBe(true)

      // Make a new change
      act(() => {
        result.current.updateSetting('phone', '+9876543210')
      })

      // Redo stack should be cleared
      expect(result.current.canRedo).toBe(false)
    })

    it('can be disabled via options', () => {
      const { result } = renderHookWithAuth(initialSettings, { enableUndo: false })

      act(() => {
        result.current.updateSetting('full_name', 'No Undo Change')
      })

      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
    })
  })

  describe('Manual Save Operations', () => {
    it('performs manual save successfully', async () => {
      const onSave = jest.fn()
      mockSupabase.update.mockResolvedValue({ error: null })
      
      const { result } = renderHookWithAuth(initialSettings, { onSave })

      act(() => {
        result.current.updateSetting('full_name', 'Manual Save Test')
      })

      expect(result.current.hasUnsavedChanges).toBe(true)

      await act(async () => {
        await result.current.save()
      })

      expect(result.current.isSaving).toBe(false)
      expect(result.current.hasUnsavedChanges).toBe(false)
      expect(onSave).toHaveBeenCalled()
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Manual Save Test',
          updated_at: expect.any(String)
        })
      )
    })

    it('shows saving indicator during manual save', async () => {
      mockSupabase.update.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ error: null }), 200))
      )
      
      const { result } = renderHookWithAuth()

      act(() => {
        result.current.updateSetting('full_name', 'Saving Indicator Test')
      })

      const savePromise = act(async () => {
        return result.current.save()
      })

      expect(result.current.isSaving).toBe(true)

      await act(async () => {
        jest.advanceTimersByTime(200)
        await savePromise
      })

      expect(result.current.isSaving).toBe(false)
    })

    it('handles save errors properly', async () => {
      const onError = jest.fn()
      const saveError = new Error('Save failed')
      mockSupabase.update.mockResolvedValue({ error: saveError })
      
      const { result } = renderHookWithAuth(initialSettings, { onError })

      act(() => {
        result.current.updateSetting('full_name', 'Error Save Test')
      })

      await act(async () => {
        try {
          await result.current.save()
        } catch (error) {
          expect(error).toBe(saveError)
        }
      })

      expect(onError).toHaveBeenCalledWith(saveError)
      expect(result.current.isSaving).toBe(false)
      expect(result.current.hasUnsavedChanges).toBe(true) // Should remain true on error
    })

    it('does not save when no changes exist', async () => {
      const { result } = renderHookWithAuth()

      const saveResult = await act(async () => {
        return result.current.save()
      })

      expect(saveResult).toBeUndefined()
      expect(mockSupabase.update).not.toHaveBeenCalled()
    })
  })

  describe('Form Reset Operations', () => {
    it('resets form to original state', () => {
      const { result } = renderHookWithAuth()

      // Make changes
      act(() => {
        result.current.updateSetting('full_name', 'Changed Name')
        result.current.updateSetting('bio', 'Changed Bio')
      })

      expect(result.current.hasUnsavedChanges).toBe(true)
      expect(Object.keys(result.current.touched).length).toBeGreaterThan(0)

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.settings).toEqual(initialSettings)
      expect(result.current.hasUnsavedChanges).toBe(false)
      expect(result.current.touched).toEqual({})
      expect(result.current.errors).toEqual({})
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
    })
  })

  describe('Data Loading Operations', () => {
    it('loads initial data successfully', async () => {
      const loadedData = {
        ...initialSettings,
        full_name: 'Loaded Name',
        bio: 'Loaded Bio'
      }
      
      mockSupabase.single.mockResolvedValue({ data: loadedData, error: null })
      
      const { result } = renderHookWithAuth()

      await act(async () => {
        await result.current.load()
      })

      expect(result.current.settings.full_name).toBe('Loaded Name')
      expect(result.current.settings.bio).toBe('Loaded Bio')
      expect(result.current.originalSettings.full_name).toBe('Loaded Name')
      expect(result.current.hasUnsavedChanges).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })

    it('shows loading indicator during data load', async () => {
      mockSupabase.single.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: initialSettings, error: null }), 200)
        )
      )
      
      const { result } = renderHookWithAuth()

      const loadPromise = act(async () => {
        return result.current.load()
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        jest.advanceTimersByTime(200)
        await loadPromise
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('handles load errors gracefully', async () => {
      const onError = jest.fn()
      const loadError = new Error('Load failed')
      mockSupabase.single.mockResolvedValue({ data: null, error: loadError })
      
      const { result } = renderHookWithAuth(initialSettings, { onError })

      await act(async () => {
        await result.current.load()
      })

      expect(onError).toHaveBeenCalledWith(loadError)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Form Validation', () => {
    it('validates form data with schema', () => {
      const mockSchema = {
        safeParse: jest.fn().mockReturnValue({
          success: true,
          data: initialSettings
        })
      }
      
      const { result } = renderHookWithAuth()

      act(() => {
        const isValid = result.current.validate(mockSchema)
        expect(isValid).toBe(true)
      })

      expect(mockSchema.safeParse).toHaveBeenCalledWith(result.current.settings)
      expect(result.current.errors).toEqual({})
    })

    it('handles validation errors', () => {
      const mockSchema = {
        safeParse: jest.fn().mockReturnValue({
          success: false,
          error: {
            errors: [
              { path: ['full_name'], message: 'Name is required' },
              { path: ['social_links', 'instagram'], message: 'Invalid handle' }
            ]
          }
        })
      }
      
      const { result } = renderHookWithAuth()

      act(() => {
        const isValid = result.current.validate(mockSchema)
        expect(isValid).toBe(false)
      })

      expect(result.current.errors).toEqual({
        'full_name': 'Name is required',
        'social_links.instagram': 'Invalid handle'
      })
    })
  })

  describe('Unsaved Changes Detection', () => {
    it('detects changes correctly', () => {
      const { result } = renderHookWithAuth()

      expect(result.current.hasUnsavedChanges).toBe(false)

      act(() => {
        result.current.updateSetting('full_name', 'Changed')
      })

      expect(result.current.hasUnsavedChanges).toBe(true)
    })

    it('calls onUnsavedChanges callback', () => {
      const onUnsavedChanges = jest.fn()
      const { result } = renderHookWithAuth(initialSettings, { onUnsavedChanges })

      act(() => {
        result.current.updateSetting('full_name', 'Changed')
      })

      expect(onUnsavedChanges).toHaveBeenCalledWith(true)

      act(() => {
        result.current.reset()
      })

      expect(onUnsavedChanges).toHaveBeenCalledWith(false)
    })
  })

  describe('Error Handling', () => {
    it('handles missing user gracefully', () => {
      const wrapper = ({ children }) => (
        <MockAuthProvider user={null}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(
        () => useCustomizationForm(initialSettings),
        { wrapper }
      )

      expect(() => {
        act(() => {
          result.current.updateSetting('full_name', 'Test')
        })
      }).not.toThrow()
    })

    it('handles invalid table names', async () => {
      mockSupabase.update.mockResolvedValue({ error: new Error('Table not found') })
      
      const { result } = renderHookWithAuth(initialSettings, { 
        tableName: 'invalid_table' 
      })

      act(() => {
        result.current.updateSetting('full_name', 'Test')
      })

      await expect(
        act(async () => await result.current.save())
      ).rejects.toThrow('Table not found')
    })
  })

  describe('Cleanup and Memory Management', () => {
    it('clears timeouts on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
      
      const { result, unmount } = renderHookWithAuth(initialSettings, {
        autoSaveDelay: 1000
      })

      act(() => {
        result.current.updateSetting('full_name', 'Test')
      })

      unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    it('does not cause memory leaks with rapid updates', () => {
      const { result } = renderHookWithAuth()

      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.updateSetting('full_name', `Test ${i}`)
        })
      }

      // Should not cause memory issues
      expect(result.current.settings.full_name).toBe('Test 99')
      expect(result.current.hasUnsavedChanges).toBe(true)
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('handles network interruption during save', async () => {
      mockSupabase.update.mockRejectedValue(new Error('Network error'))
      
      const { result } = renderHookWithAuth()

      act(() => {
        result.current.updateSetting('full_name', 'Network Test')
      })

      await expect(
        act(async () => await result.current.save())
      ).rejects.toThrow('Network error')

      expect(result.current.hasUnsavedChanges).toBe(true)
      expect(result.current.isSaving).toBe(false)
    })

    it('handles concurrent save operations', async () => {
      let saveCount = 0
      mockSupabase.update.mockImplementation(() => {
        saveCount++
        return Promise.resolve({ error: null })
      })
      
      const { result } = renderHookWithAuth()

      act(() => {
        result.current.updateSetting('full_name', 'Concurrent Test')
      })

      // Trigger multiple saves simultaneously
      const saves = Promise.all([
        act(async () => result.current.save()),
        act(async () => result.current.save()),
        act(async () => result.current.save())
      ])

      await saves

      // Should handle concurrent saves gracefully
      expect(saveCount).toBeGreaterThan(0)
    })

    it('handles invalid JSON data gracefully', () => {
      const invalidData = {
        circular: {}
      }
      invalidData.circular.self = invalidData.circular
      
      expect(() => {
        renderHookWithAuth(invalidData)
      }).not.toThrow()
    })
  })
})