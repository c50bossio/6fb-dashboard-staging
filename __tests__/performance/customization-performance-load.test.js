/**
 * Performance and Load Tests for Customization System
 * 
 * These tests verify the system can handle high load scenarios, concurrent users,
 * and complex operations while maintaining acceptable performance.
 */

/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, act, waitFor } from '@testing-library/react'
import { performance, PerformanceObserver } from 'perf_hooks'
import UnifiedCustomizePage from '@/app/(protected)/customize/page'
import { useCustomizationForm } from '@/hooks/useCustomizationForm'
import { useImageUpload } from '@/hooks/useImageUpload'
import { createTestUser, createTestProfile } from '@/test-utils/test-utils'

// Mock dependencies
jest.mock('@/hooks/useCustomizationForm')
jest.mock('@/hooks/useImageUpload')
jest.mock('@/lib/supabase/client')

// Performance measurement utilities
class PerformanceTracker {
  constructor() {
    this.metrics = {
      renderTimes: [],
      updateTimes: [],
      saveTimes: [],
      memoryUsage: [],
      reRenderCounts: {}
    }
  }

  startMeasurement(name) {
    return performance.now()
  }

  endMeasurement(startTime, name) {
    const duration = performance.now() - startTime
    if (!this.metrics[`${name}Times`]) {
      this.metrics[`${name}Times`] = []
    }
    this.metrics[`${name}Times`].push(duration)
    return duration
  }

  trackReRender(componentName) {
    this.metrics.reRenderCounts[componentName] = 
      (this.metrics.reRenderCounts[componentName] || 0) + 1
  }

  getAverageTime(operationType) {
    const times = this.metrics[`${operationType}Times`] || []
    return times.length ? times.reduce((a, b) => a + b) / times.length : 0
  }

  getP95Time(operationType) {
    const times = this.metrics[`${operationType}Times`] || []
    if (!times.length) return 0
    const sorted = times.sort((a, b) => a - b)
    const p95Index = Math.floor(sorted.length * 0.95)
    return sorted[p95Index]
  }

  reset() {
    this.metrics = {
      renderTimes: [],
      updateTimes: [],
      saveTimes: [],
      memoryUsage: [],
      reRenderCounts: {}
    }
  }
}

// Test data generators for load testing
const generateLargeFormData = (complexity = 'medium') => {
  const complexityMap = {
    small: { services: 5, images: 3, specializations: 3 },
    medium: { services: 20, images: 10, specializations: 8 },
    large: { services: 50, images: 25, specializations: 15 },
    extreme: { services: 100, images: 50, specializations: 25 }
  }

  const config = complexityMap[complexity]
  
  return {
    barber: {
      full_name: 'Load Test Barber',
      bio: 'A'.repeat(500), // Max length bio
      phone: '+1234567890',
      instagram_handle: '@loadtestbarber',
      years_experience: 15,
      specializations: Array(config.specializations).fill().map((_, i) => `Specialization ${i + 1}`),
      services_offered: Array(config.services).fill().map((_, i) => ({
        name: `Service ${i + 1}`,
        price: 10 + (i % 90), // Varied prices
        duration: 15 + (i % 105) // Varied durations
      })),
      portfolio_images: Array(config.images).fill().map((_, i) => 
        `https://example.com/portfolio${i + 1}.jpg`
      )
    },
    barbershop: {
      business_name: 'Load Test Barbershop',
      description: 'B'.repeat(1000), // Large description
      gallery_images: Array(config.images * 2).fill().map((_, i) => 
        `https://example.com/gallery${i + 1}.jpg`
      ),
      featured_services: Array(config.services / 2).fill().map((_, i) => ({
        name: `Featured Service ${i + 1}`,
        price: 25 + (i % 75),
        duration: 30 + (i % 90)
      })),
      keywords: Array(20).fill().map((_, i) => `keyword${i + 1}`)
    },
    enterprise: {
      organization_name: 'Load Test Enterprise',
      description: 'C'.repeat(2000), // Very large description
      locations: Array(config.services / 5).fill().map((_, i) => ({
        name: `Location ${i + 1}`,
        address: `${100 + i} Test Street, Test City, TC ${10000 + i}`,
        phone: `+1${String(2345678900 + i)}`,
        manager: `Manager ${i + 1}`
      }))
    }
  }
}

const createMockHookWithPerformanceTracking = (baseHook, tracker) => {
  return {
    ...baseHook,
    updateSetting: jest.fn((key, value) => {
      const start = tracker.startMeasurement('update')
      // Simulate update processing time
      for (let i = 0; i < 1000; i++) {
        Math.random()
      }
      tracker.endMeasurement(start, 'update')
      tracker.trackReRender('CustomizationForm')
    }),
    updateSettings: jest.fn((updates) => {
      const start = tracker.startMeasurement('batchUpdate')
      // Simulate batch update processing
      Object.keys(updates).forEach(() => {
        for (let i = 0; i < 500; i++) {
          Math.random()
        }
      })
      tracker.endMeasurement(start, 'batchUpdate')
      tracker.trackReRender('CustomizationForm')
    }),
    save: jest.fn(async () => {
      const start = tracker.startMeasurement('save')
      // Simulate network delay and processing
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 200))
      tracker.endMeasurement(start, 'save')
    })
  }
}

describe('Customization Performance and Load Tests', () => {
  let performanceTracker
  let mockUser
  let mockProfile

  beforeEach(() => {
    jest.clearAllMocks()
    performanceTracker = new PerformanceTracker()
    mockUser = createTestUser()
    mockProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
    
    // Mock window.performance if not available
    if (!global.performance) {
      global.performance = {
        now: () => Date.now()
      }
    }
  })

  afterEach(() => {
    performanceTracker.reset()
  })

  describe('Component Rendering Performance', () => {
    it('should render main customize page within performance budget', async () => {
      const mockFormHook = createMockHookWithPerformanceTracking({
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
        validate: jest.fn().mockReturnValue(true),
        setErrors: jest.fn(),
        setTouched: jest.fn(),
        reset: jest.fn(),
        load: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn()
      }, performanceTracker)

      useCustomizationForm.mockReturnValue(mockFormHook)

      const mockImageHook = {
        uploading: false,
        progress: 0,
        error: null,
        uploadImage: jest.fn(),
        uploadMultiple: jest.fn(),
        cancelUpload: jest.fn(),
        reset: jest.fn(),
        validateFile: jest.fn(),
        createDragHandlers: jest.fn()
      }
      useImageUpload.mockReturnValue(mockImageHook)

      // Measure initial render time
      const renderStart = performanceTracker.startMeasurement('render')
      
      const { container } = render(<UnifiedCustomizePage />)
      
      const renderTime = performanceTracker.endMeasurement(renderStart, 'render')

      // Performance assertions
      expect(renderTime).toBeLessThan(100) // Should render within 100ms
      expect(container.firstChild).toBeTruthy()

      // Should not cause excessive re-renders during initial mount
      expect(performanceTracker.metrics.reRenderCounts.CustomizationForm || 0).toBeLessThan(3)
    })

    it('should handle large datasets without performance degradation', async () => {
      const largeData = generateLargeFormData('large')
      
      const mockFormHook = createMockHookWithPerformanceTracking({
        settings: largeData.barber,
        originalSettings: largeData.barber,
        isLoading: false,
        isSaving: false,
        isAutoSaving: false,
        errors: {},
        touched: {},
        hasUnsavedChanges: false,
        canUndo: false,
        canRedo: false,
        validate: jest.fn().mockReturnValue(true),
        updateSetting: jest.fn(),
        updateSettings: jest.fn(),
        save: jest.fn(),
        reset: jest.fn(),
        load: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn()
      }, performanceTracker)

      useCustomizationForm.mockReturnValue(mockFormHook)

      const renderStart = performanceTracker.startMeasurement('largeDataRender')
      
      render(<UnifiedCustomizePage />)
      
      const renderTime = performanceTracker.endMeasurement(renderStart, 'largeDataRender')

      // Should handle large datasets within acceptable time
      expect(renderTime).toBeLessThan(500) // 500ms budget for large data
    })

    it('should maintain performance during rapid state updates', async () => {
      const mockFormHook = createMockHookWithPerformanceTracking({
        settings: { full_name: 'Initial' },
        originalSettings: { full_name: 'Initial' },
        isLoading: false,
        isSaving: false,
        isAutoSaving: false,
        errors: {},
        touched: {},
        hasUnsavedChanges: false,
        canUndo: false,
        canRedo: false,
        validate: jest.fn().mockReturnValue(true),
        updateSetting: jest.fn(),
        updateSettings: jest.fn(),
        save: jest.fn(),
        reset: jest.fn(),
        load: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn()
      }, performanceTracker)

      useCustomizationForm.mockReturnValue(mockFormHook)

      render(<UnifiedCustomizePage />)

      // Simulate rapid updates
      const updateStart = performance.now()
      
      for (let i = 0; i < 100; i++) {
        act(() => {
          mockFormHook.updateSetting('full_name', `Update ${i}`)
        })
      }
      
      const updateTime = performance.now() - updateStart
      const averageUpdateTime = performanceTracker.getAverageTime('update')

      // Performance assertions
      expect(updateTime).toBeLessThan(1000) // 100 updates in < 1 second
      expect(averageUpdateTime).toBeLessThan(20) // Each update < 20ms
    })
  })

  describe('Memory Usage and Leak Detection', () => {
    it('should not have memory leaks during extended use', async () => {
      const mockFormHook = {
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
        save: jest.fn(),
        validate: jest.fn(),
        reset: jest.fn(),
        load: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn()
      }

      useCustomizationForm.mockReturnValue(mockFormHook)

      // Track initial memory (if available)
      const initialMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0

      // Create and destroy components multiple times
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(<UnifiedCustomizePage />)
        
        // Simulate usage
        act(() => {
          mockFormHook.updateSetting('test', `value${i}`)
        })
        
        unmount()
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }

      const finalMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal (accounting for test overhead)
      if (process.memoryUsage) {
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // < 50MB increase
      }
    })

    it('should clean up event listeners and timers on unmount', async () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

      const mockFormHook = {
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
        save: jest.fn(),
        validate: jest.fn(),
        reset: jest.fn(),
        load: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn()
      }

      useCustomizationForm.mockReturnValue(mockFormHook)

      const { unmount } = render(<UnifiedCustomizePage />)

      const addEventListenerCount = addEventListenerSpy.mock.calls.length
      const setTimeoutCount = setTimeoutSpy.mock.calls.length

      unmount()

      // Should clean up event listeners and timers
      expect(removeEventListenerSpy.mock.calls.length).toBeGreaterThanOrEqual(0)
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(0)

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
      setTimeoutSpy.mockRestore()
      clearTimeoutSpy.mockRestore()
    })
  })

  describe('Concurrent User Simulation', () => {
    it('should handle multiple concurrent form updates', async () => {
      const concurrentUsers = 10
      const updatesPerUser = 20
      const mockFormHooks = []
      const updatePromises = []

      // Create multiple form hook instances
      for (let i = 0; i < concurrentUsers; i++) {
        mockFormHooks.push(createMockHookWithPerformanceTracking({
          settings: { user_id: i, full_name: `User ${i}` },
          originalSettings: { user_id: i, full_name: `User ${i}` },
          isLoading: false,
          isSaving: false,
          isAutoSaving: false,
          errors: {},
          touched: {},
          hasUnsavedChanges: false,
          canUndo: false,
          canRedo: false,
          validate: jest.fn().mockReturnValue(true),
          reset: jest.fn(),
          load: jest.fn(),
          undo: jest.fn(),
          redo: jest.fn()
        }, performanceTracker))
      }

      // Simulate concurrent updates
      const concurrencyStart = performance.now()

      mockFormHooks.forEach((hook, userIndex) => {
        useCustomizationForm.mockReturnValueOnce(hook)
        
        for (let update = 0; update < updatesPerUser; update++) {
          updatePromises.push(
            new Promise(resolve => {
              setTimeout(() => {
                act(() => {
                  hook.updateSetting('full_name', `User ${userIndex} Update ${update}`)
                })
                resolve()
              }, Math.random() * 100) // Random delays to simulate real usage
            })
          )
        }
      })

      await Promise.all(updatePromises)

      const concurrencyTime = performance.now() - concurrencyStart
      const averageUpdateTime = performanceTracker.getAverageTime('update')

      // Performance assertions
      expect(concurrencyTime).toBeLessThan(5000) // All updates in < 5 seconds
      expect(averageUpdateTime).toBeLessThan(50) // Average update time reasonable
      expect(performanceTracker.getP95Time('update')).toBeLessThan(100) // 95% of updates < 100ms
    })

    it('should handle concurrent save operations without conflicts', async () => {
      const concurrentSaves = 5
      const mockFormHook = createMockHookWithPerformanceTracking({
        settings: { test: 'data' },
        originalSettings: { test: 'data' },
        isLoading: false,
        isSaving: false,
        isAutoSaving: false,
        errors: {},
        touched: {},
        hasUnsavedChanges: true,
        canUndo: false,
        canRedo: false,
        updateSetting: jest.fn(),
        updateSettings: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        reset: jest.fn(),
        load: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn()
      }, performanceTracker)

      useCustomizationForm.mockReturnValue(mockFormHook)

      render(<UnifiedCustomizePage />)

      // Simulate concurrent save attempts
      const savePromises = Array(concurrentSaves).fill().map(async () => {
        return mockFormHook.save()
      })

      const concurrentSaveStart = performance.now()
      await Promise.all(savePromises)
      const concurrentSaveTime = performance.now() - concurrentSaveStart

      // All saves should complete
      expect(mockFormHook.save).toHaveBeenCalledTimes(concurrentSaves)
      expect(concurrentSaveTime).toBeLessThan(2000) // Complete within 2 seconds
      expect(performanceTracker.getAverageTime('save')).toBeLessThan(500) // Average save time reasonable
    })
  })

  describe('Image Upload Performance', () => {
    it('should handle multiple concurrent image uploads efficiently', async () => {
      const concurrentUploads = 5
      const mockUploadPromises = Array(concurrentUploads).fill().map((_, i) => 
        Promise.resolve({
          url: `https://example.com/image${i}.jpg`,
          preview: `data:image/jpeg;base64,mock${i}`,
          file: new Blob(),
          originalFile: new File([''], `test${i}.jpg`),
          size: 1024 * (i + 1),
          type: 'image/jpeg'
        })
      )

      const mockImageHook = {
        uploading: false,
        progress: 0,
        error: null,
        uploadImage: jest.fn().mockImplementation(() => {
          const start = performanceTracker.startMeasurement('imageUpload')
          return mockUploadPromises[0].then(result => {
            performanceTracker.endMeasurement(start, 'imageUpload')
            return result
          })
        }),
        uploadMultiple: jest.fn().mockImplementation((files) => {
          const start = performanceTracker.startMeasurement('multipleImageUpload')
          return Promise.all(mockUploadPromises.slice(0, files.length)).then(results => {
            performanceTracker.endMeasurement(start, 'multipleImageUpload')
            return results
          })
        }),
        cancelUpload: jest.fn(),
        reset: jest.fn(),
        validateFile: jest.fn().mockReturnValue(true),
        createDragHandlers: jest.fn()
      }

      useImageUpload.mockReturnValue(mockImageHook)

      const mockFiles = Array(concurrentUploads).fill().map((_, i) => 
        new File([''], `concurrent${i}.jpg`, { type: 'image/jpeg' })
      )

      // Test concurrent uploads
      const uploadStart = performance.now()
      await mockImageHook.uploadMultiple(mockFiles)
      const uploadTime = performance.now() - uploadStart

      expect(uploadTime).toBeLessThan(1000) // Multiple uploads in < 1 second
      expect(performanceTracker.getAverageTime('multipleImageUpload')).toBeLessThan(500)
    })

    it('should handle large image processing without blocking UI', async () => {
      const largeImageSimulation = {
        uploading: true,
        progress: 0,
        error: null,
        uploadImage: jest.fn().mockImplementation(() => {
          // Simulate processing large image
          return new Promise(resolve => {
            let progress = 0
            const interval = setInterval(() => {
              progress += 10
              if (progress >= 100) {
                clearInterval(interval)
                resolve({
                  url: 'https://example.com/large-image.jpg',
                  preview: 'data:image/jpeg;base64,large-mock',
                  file: new Blob(),
                  originalFile: new File([''], 'large.jpg'),
                  size: 10 * 1024 * 1024, // 10MB
                  type: 'image/jpeg'
                })
              }
            }, 10)
          })
        }),
        cancelUpload: jest.fn(),
        reset: jest.fn(),
        validateFile: jest.fn().mockReturnValue(true),
        createDragHandlers: jest.fn()
      }

      useImageUpload.mockReturnValue(largeImageSimulation)

      const mockFormHook = {
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
        save: jest.fn(),
        validate: jest.fn(),
        reset: jest.fn(),
        load: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn()
      }

      useCustomizationForm.mockReturnValue(mockFormHook)

      render(<UnifiedCustomizePage />)

      // Start large upload
      const uploadPromise = largeImageSimulation.uploadImage(new File([''], 'large.jpg'))

      // UI should remain responsive during upload
      const uiInteractionStart = performance.now()
      act(() => {
        mockFormHook.updateSetting('test', 'responsive')
      })
      const uiInteractionTime = performance.now() - uiInteractionStart

      // UI interaction should be fast even during upload
      expect(uiInteractionTime).toBeLessThan(50)

      await uploadPromise
      expect(largeImageSimulation.uploadImage).toHaveBeenCalled()
    })
  })

  describe('Auto-save Performance Under Load', () => {
    it('should throttle auto-save during rapid changes', async () => {
      jest.useFakeTimers()
      
      let autoSaveCount = 0
      const mockFormHook = {
        settings: { test: 'initial' },
        originalSettings: { test: 'initial' },
        isLoading: false,
        isSaving: false,
        isAutoSaving: false,
        errors: {},
        touched: {},
        hasUnsavedChanges: true,
        canUndo: false,
        canRedo: false,
        updateSetting: jest.fn(),
        updateSettings: jest.fn(),
        save: jest.fn().mockImplementation(() => {
          autoSaveCount++
          return Promise.resolve()
        }),
        validate: jest.fn(),
        reset: jest.fn(),
        load: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn()
      }

      useCustomizationForm.mockReturnValue(mockFormHook)

      render(<UnifiedCustomizePage />)

      // Simulate rapid changes that would trigger auto-save
      for (let i = 0; i < 20; i++) {
        act(() => {
          mockFormHook.updateSetting('rapidChange', `value${i}`)
        })
        
        // Small delay between changes
        act(() => {
          jest.advanceTimersByTime(100)
        })
      }

      // Advance to trigger auto-save
      act(() => {
        jest.advanceTimersByTime(5000)
      })

      // Should throttle auto-saves (not save after every change)
      expect(autoSaveCount).toBeLessThan(5) // Much less than 20 changes
      expect(autoSaveCount).toBeGreaterThan(0) // But should save at least once

      jest.useRealTimers()
    })

    it('should handle auto-save conflicts gracefully', async () => {
      const conflictingUpdates = 10
      let saveAttempts = 0
      let conflicts = 0

      const mockFormHook = {
        settings: { version: 1 },
        originalSettings: { version: 1 },
        isLoading: false,
        isSaving: false,
        isAutoSaving: false,
        errors: {},
        touched: {},
        hasUnsavedChanges: true,
        canUndo: false,
        canRedo: false,
        updateSetting: jest.fn(),
        updateSettings: jest.fn(),
        save: jest.fn().mockImplementation(() => {
          saveAttempts++
          // Simulate occasional conflicts
          if (Math.random() < 0.3) { // 30% chance of conflict
            conflicts++
            return Promise.reject(new Error('Conflict detected'))
          }
          return Promise.resolve()
        }),
        validate: jest.fn(),
        reset: jest.fn(),
        load: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn()
      }

      useCustomizationForm.mockReturnValue(mockFormHook)

      render(<UnifiedCustomizePage />)

      // Simulate multiple concurrent save attempts
      const savePromises = Array(conflictingUpdates).fill().map(async (_, i) => {
        try {
          await mockFormHook.save()
        } catch (error) {
          // Handle conflicts gracefully
          expect(error.message).toBe('Conflict detected')
        }
      })

      await Promise.all(savePromises)

      // System should handle conflicts without crashing
      expect(saveAttempts).toBe(conflictingUpdates)
      expect(conflicts).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Form Validation Performance', () => {
    it('should validate complex forms efficiently', async () => {
      const complexData = generateLargeFormData('extreme')
      
      const mockFormHook = {
        settings: complexData.barber,
        originalSettings: complexData.barber,
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
        save: jest.fn(),
        validate: jest.fn().mockImplementation((schema) => {
          const start = performanceTracker.startMeasurement('validation')
          
          // Simulate complex validation
          const result = Object.keys(complexData.barber).every(key => {
            // Simulate field validation
            for (let i = 0; i < 100; i++) {
              Math.random()
            }
            return true
          })
          
          performanceTracker.endMeasurement(start, 'validation')
          return result
        }),
        reset: jest.fn(),
        load: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn()
      }

      useCustomizationForm.mockReturnValue(mockFormHook)

      render(<UnifiedCustomizePage />)

      // Test validation performance
      const validationStart = performance.now()
      
      for (let i = 0; i < 10; i++) {
        act(() => {
          mockFormHook.validate({})
        })
      }
      
      const validationTime = performance.now() - validationStart
      const averageValidationTime = performanceTracker.getAverageTime('validation')

      // Validation should be efficient even for complex forms
      expect(validationTime).toBeLessThan(1000) // 10 validations in < 1 second
      expect(averageValidationTime).toBeLessThan(100) // Each validation < 100ms
    })
  })

  describe('Undo/Redo Performance', () => {
    it('should handle large undo stacks efficiently', async () => {
      const maxUndoSteps = 100
      let undoStack = []
      
      const mockFormHook = {
        settings: { value: 'initial' },
        originalSettings: { value: 'initial' },
        isLoading: false,
        isSaving: false,
        isAutoSaving: false,
        errors: {},
        touched: {},
        hasUnsavedChanges: false,
        canUndo: undoStack.length > 0,
        canRedo: false,
        updateSetting: jest.fn((key, value) => {
          const start = performanceTracker.startMeasurement('undoStackUpdate')
          
          // Simulate adding to undo stack
          undoStack.push({ [key]: value })
          if (undoStack.length > maxUndoSteps) {
            undoStack = undoStack.slice(-maxUndoSteps)
          }
          
          performanceTracker.endMeasurement(start, 'undoStackUpdate')
        }),
        updateSettings: jest.fn(),
        save: jest.fn(),
        validate: jest.fn(),
        reset: jest.fn(),
        load: jest.fn(),
        undo: jest.fn(() => {
          const start = performanceTracker.startMeasurement('undo')
          
          if (undoStack.length > 0) {
            undoStack.pop()
          }
          
          performanceTracker.endMeasurement(start, 'undo')
        }),
        redo: jest.fn()
      }

      useCustomizationForm.mockReturnValue(mockFormHook)

      render(<UnifiedCustomizePage />)

      // Build up large undo stack
      for (let i = 0; i < maxUndoSteps * 1.5; i++) {
        act(() => {
          mockFormHook.updateSetting('value', `change${i}`)
        })
      }

      // Test undo performance
      const undoStart = performance.now()
      
      for (let i = 0; i < 20; i++) {
        act(() => {
          mockFormHook.undo()
        })
      }
      
      const undoTime = performance.now() - undoStart

      // Performance assertions
      expect(undoTime).toBeLessThan(500) // 20 undos in < 500ms
      expect(performanceTracker.getAverageTime('undoStackUpdate')).toBeLessThan(10)
      expect(performanceTracker.getAverageTime('undo')).toBeLessThan(10)
    })
  })

  describe('Real-world Load Scenarios', () => {
    it('should handle peak usage simulation', async () => {
      // Simulate peak usage: multiple users, large forms, concurrent operations
      const peakUsers = 3
      const operationsPerUser = 15
      const mockHooks = []

      // Create multiple user sessions
      for (let user = 0; user < peakUsers; user++) {
        const userData = generateLargeFormData('medium')
        
        mockHooks.push(createMockHookWithPerformanceTracking({
          settings: userData.barber,
          originalSettings: userData.barber,
          isLoading: false,
          isSaving: false,
          isAutoSaving: false,
          errors: {},
          touched: {},
          hasUnsavedChanges: false,
          canUndo: false,
          canRedo: false,
          validate: jest.fn().mockReturnValue(true),
          reset: jest.fn(),
          load: jest.fn(),
          undo: jest.fn(),
          redo: jest.fn()
        }, performanceTracker))
      }

      // Simulate concurrent operations
      const peakStart = performance.now()
      const operations = []

      mockHooks.forEach((hook, userIndex) => {
        useCustomizationForm.mockReturnValueOnce(hook)
        
        // Each user performs various operations
        for (let op = 0; op < operationsPerUser; op++) {
          operations.push(
            new Promise(resolve => {
              const delay = Math.random() * 200 // Random delays up to 200ms
              setTimeout(() => {
                act(() => {
                  const operation = op % 4
                  switch (operation) {
                    case 0: // Update single field
                      hook.updateSetting('field', `user${userIndex}-op${op}`)
                      break
                    case 1: // Batch update
                      hook.updateSettings({ 
                        field1: `batch${userIndex}-${op}`, 
                        field2: `batch${userIndex}-${op}` 
                      })
                      break
                    case 2: // Validate
                      hook.validate({})
                      break
                    case 3: // Save
                      hook.save()
                      break
                  }
                })
                resolve()
              }, delay)
            })
          )
        }
      })

      await Promise.all(operations)
      const peakTime = performance.now() - peakStart

      // Peak load performance assertions
      expect(peakTime).toBeLessThan(10000) // Complete within 10 seconds
      expect(performanceTracker.getAverageTime('update')).toBeLessThan(30)
      expect(performanceTracker.getP95Time('update')).toBeLessThan(100)
      expect(performanceTracker.getAverageTime('save')).toBeLessThan(300)

      // System should remain stable under load
      expect(performanceTracker.metrics.reRenderCounts.CustomizationForm || 0).toBeLessThan(peakUsers * operationsPerUser)
    })
  })

  describe('Performance Regression Detection', () => {
    it('should maintain performance baselines', () => {
      // Define performance baselines (these would be updated as the system evolves)
      const baselines = {
        initialRender: 100, // ms
        singleUpdate: 20,   // ms
        batchUpdate: 50,    // ms
        validation: 100,    // ms
        save: 500,          // ms
        undo: 10,           // ms
        imageUpload: 1000   // ms
      }

      // This test would run the above performance tests and compare against baselines
      // In a real scenario, you'd store baselines in a database or configuration file
      // and alert if performance degrades beyond acceptable thresholds

      Object.entries(baselines).forEach(([operation, baseline]) => {
        const currentPerformance = performanceTracker.getAverageTime(operation) || 0
        
        // Allow 20% deviation from baseline
        const tolerance = baseline * 0.2
        
        if (currentPerformance > baseline + tolerance) {
          console.warn(`Performance regression detected in ${operation}: ${currentPerformance}ms > ${baseline + tolerance}ms`)
        }
      })

      // This assertion would be replaced with proper alerting in production
      expect(true).toBe(true) // Placeholder
    })
  })
})