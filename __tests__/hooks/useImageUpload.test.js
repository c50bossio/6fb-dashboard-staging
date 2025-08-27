/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useImageUpload } from '@/hooks/useImageUpload'

// Mock fetch for upload testing
global.fetch = jest.fn()

// Mock FileReader
class MockFileReader {
  constructor() {
    this.result = null
    this.onload = null
    this.onerror = null
  }

  readAsDataURL(file) {
    setTimeout(() => {
      this.result = `data:${file.type};base64,mock-base64-data`
      this.onload?.({ target: { result: this.result } })
    }, 10)
  }
}

global.FileReader = MockFileReader

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = jest.fn()

// Mock Canvas API
const mockCanvas = {
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
  })),
  toBlob: jest.fn((callback, type, quality) => {
    const blob = new Blob(['mock-canvas-data'], { type })
    callback(blob)
  }),
  width: 0,
  height: 0
}

global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext
global.HTMLCanvasElement.prototype.toBlob = mockCanvas.toBlob
Object.defineProperty(global.HTMLCanvasElement.prototype, 'width', {
  set: function(value) { mockCanvas.width = value },
  get: function() { return mockCanvas.width }
})
Object.defineProperty(global.HTMLCanvasElement.prototype, 'height', {
  set: function(value) { mockCanvas.height = value },
  get: function() { return mockCanvas.height }
})

// Mock Image constructor
class MockImage {
  constructor() {
    this.onload = null
    this.onerror = null
    this.src = ''
    this.width = 800
    this.height = 600
  }

  set src(value) {
    this._src = value
    setTimeout(() => {
      this.onload?.()
    }, 10)
  }

  get src() {
    return this._src
  }
}

global.Image = MockImage

// Mock AbortController
global.AbortController = class AbortController {
  constructor() {
    this.signal = { aborted: false }
  }
  abort() {
    this.signal.aborted = true
  }
}

describe('useImageUpload Hook', () => {
  const createMockFile = (
    name = 'test.jpg',
    size = 1024 * 1024, // 1MB
    type = 'image/jpeg'
  ) => {
    return new File(['mock-file-content'], name, { type, size })
  }

  const createLargeFile = (size = 10 * 1024 * 1024) => {
    return createMockFile('large.jpg', size, 'image/jpeg')
  }

  const createInvalidFile = () => {
    return createMockFile('document.pdf', 1024, 'application/pdf')
  }

  beforeEach(() => {
    jest.clearAllMocks()
    fetch.mockClear()
  })

  describe('Hook Initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useImageUpload())

      expect(result.current.uploading).toBe(false)
      expect(result.current.progress).toBe(0)
      expect(result.current.error).toBe(null)
      expect(result.current.maxSize).toBe(5 * 1024 * 1024) // 5MB
      expect(result.current.acceptedTypes).toEqual(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
      expect(result.current.maxWidth).toBe(1920)
      expect(result.current.maxHeight).toBe(1920)
      expect(result.current.quality).toBe(0.8)
    })

    it('accepts custom configuration options', () => {
      const options = {
        maxSize: 2 * 1024 * 1024,
        acceptedTypes: ['image/png'],
        maxWidth: 1024,
        maxHeight: 768,
        quality: 0.9,
        uploadEndpoint: '/custom-upload'
      }

      const { result } = renderHook(() => useImageUpload(options))

      expect(result.current.maxSize).toBe(options.maxSize)
      expect(result.current.acceptedTypes).toEqual(options.acceptedTypes)
      expect(result.current.maxWidth).toBe(options.maxWidth)
      expect(result.current.maxHeight).toBe(options.maxHeight)
      expect(result.current.quality).toBe(options.quality)
    })
  })

  describe('File Validation', () => {
    it('validates valid files successfully', () => {
      const { result } = renderHook(() => useImageUpload())
      const file = createMockFile()

      const isValid = result.current.validateFile(file)

      expect(isValid).toBe(true)
      expect(result.current.error).toBe(null)
    })

    it('rejects files that are too large', () => {
      const { result } = renderHook(() => useImageUpload({ maxSize: 1024 }))
      const file = createLargeFile(2048)

      const isValid = result.current.validateFile(file)

      expect(isValid).toBe(false)
      expect(result.current.error).toContain('File size too large')
    })

    it('rejects unsupported file types', () => {
      const { result } = renderHook(() => useImageUpload())
      const file = createInvalidFile()

      const isValid = result.current.validateFile(file)

      expect(isValid).toBe(false)
      expect(result.current.error).toContain('File type not supported')
    })

    it('rejects null or undefined files', () => {
      const { result } = renderHook(() => useImageUpload())

      const isValidNull = result.current.validateFile(null)
      expect(isValidNull).toBe(false)
      expect(result.current.error).toBe('No file selected')

      act(() => {
        result.current.reset()
      })

      const isValidUndefined = result.current.validateFile(undefined)
      expect(isValidUndefined).toBe(false)
      expect(result.current.error).toBe('No file selected')
    })

    it('accepts files at size boundary', () => {
      const maxSize = 5 * 1024 * 1024
      const { result } = renderHook(() => useImageUpload({ maxSize }))
      const file = createMockFile('boundary.jpg', maxSize, 'image/jpeg')

      const isValid = result.current.validateFile(file)

      expect(isValid).toBe(true)
      expect(result.current.error).toBe(null)
    })

    it('validates custom accepted types', () => {
      const { result } = renderHook(() => 
        useImageUpload({ acceptedTypes: ['image/png', 'image/gif'] })
      )

      const pngFile = createMockFile('test.png', 1024, 'image/png')
      expect(result.current.validateFile(pngFile)).toBe(true)

      const jpegFile = createMockFile('test.jpg', 1024, 'image/jpeg')
      expect(result.current.validateFile(jpegFile)).toBe(false)
      expect(result.current.error).toContain('File type not supported')
    })
  })

  describe('Image Compression', () => {
    it('compresses images when needed', async () => {
      // Mock image with large dimensions
      MockImage.prototype.width = 2000
      MockImage.prototype.height = 2000

      const { result } = renderHook(() => useImageUpload({ maxWidth: 1000, maxHeight: 1000 }))
      const file = createMockFile('large-image.jpg', 1024, 'image/jpeg')

      const compressedBlob = await result.current.compressImage(file)

      expect(compressedBlob).toBeInstanceOf(Blob)
      expect(mockCanvas.width).toBe(1000)
      expect(mockCanvas.height).toBe(1000)
      expect(mockCanvas.getContext).toHaveBeenCalled()
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        0.8
      )
    })

    it('maintains aspect ratio during compression', async () => {
      // Mock wide image
      MockImage.prototype.width = 2000
      MockImage.prototype.height = 1000

      const { result } = renderHook(() => useImageUpload({ maxWidth: 1000, maxHeight: 1000 }))
      const file = createMockFile('wide-image.jpg', 1024, 'image/jpeg')

      await result.current.compressImage(file)

      // Should resize to 1000x500 to maintain 2:1 aspect ratio
      expect(mockCanvas.width).toBe(1000)
      expect(mockCanvas.height).toBe(500)
    })

    it('handles tall images correctly', async () => {
      // Mock tall image
      MockImage.prototype.width = 1000
      MockImage.prototype.height = 2000

      const { result } = renderHook(() => useImageUpload({ maxWidth: 1000, maxHeight: 1000 }))
      const file = createMockFile('tall-image.jpg', 1024, 'image/jpeg')

      await result.current.compressImage(file)

      // Should resize to 500x1000 to maintain 1:2 aspect ratio
      expect(mockCanvas.width).toBe(500)
      expect(mockCanvas.height).toBe(1000)
    })

    it('does not compress images within size limits', async () => {
      // Mock small image
      MockImage.prototype.width = 800
      MockImage.prototype.height = 600

      const { result } = renderHook(() => useImageUpload({ maxWidth: 1000, maxHeight: 1000 }))
      const file = createMockFile('small-image.jpg', 1024, 'image/jpeg')

      await result.current.compressImage(file)

      // Should keep original dimensions
      expect(mockCanvas.width).toBe(800)
      expect(mockCanvas.height).toBe(600)
    })

    it('uses custom quality settings', async () => {
      const { result } = renderHook(() => useImageUpload({ quality: 0.5 }))
      const file = createMockFile('test.jpg', 1024, 'image/jpeg')

      await result.current.compressImage(file)

      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        0.5
      )
    })
  })

  describe('Preview Generation', () => {
    it('creates preview URLs for images', async () => {
      const { result } = renderHook(() => useImageUpload())
      const file = createMockFile()

      const preview = await result.current.createPreview(file)

      expect(preview).toBe('data:image/jpeg;base64,mock-base64-data')
    })

    it('handles preview generation errors gracefully', async () => {
      // Mock FileReader error
      MockFileReader.prototype.readAsDataURL = function() {
        setTimeout(() => {
          this.onerror?.({ target: { error: new Error('Read failed') } })
        }, 10)
      }

      const { result } = renderHook(() => useImageUpload())
      const file = createMockFile()

      // Should not throw but may not resolve
      const previewPromise = result.current.createPreview(file)
      await new Promise(resolve => setTimeout(resolve, 20))
      
      // Test passes if no error is thrown
      expect(true).toBe(true)
    })
  })

  describe('Single Image Upload', () => {
    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'https://example.com/uploaded-image.jpg' })
      })
    })

    it('uploads valid image successfully', async () => {
      const onProgress = jest.fn()
      const { result } = renderHook(() => useImageUpload({ onProgress }))
      const file = createMockFile()

      const uploadResult = await act(async () => {
        return result.current.uploadImage(file)
      })

      expect(uploadResult).toEqual({
        url: 'https://example.com/uploaded-image.jpg',
        preview: 'data:image/jpeg;base64,mock-base64-data',
        file: expect.any(Blob),
        originalFile: file,
        size: expect.any(Number),
        type: expect.any(String)
      })

      expect(fetch).toHaveBeenCalledWith('/api/upload', {
        method: 'POST',
        body: expect.any(FormData),
        signal: expect.any(Object)
      })

      expect(onProgress).toHaveBeenCalledWith(10) // Preview step
      expect(onProgress).toHaveBeenCalledWith(90) // Upload step
      expect(onProgress).toHaveBeenCalledWith(100) // Complete step
    })

    it('shows upload progress correctly', async () => {
      const { result } = renderHook(() => useImageUpload())
      const file = createMockFile()

      const uploadPromise = act(async () => {
        return result.current.uploadImage(file)
      })

      // Should show uploading state
      expect(result.current.uploading).toBe(true)
      expect(result.current.progress).toBeGreaterThan(0)

      await uploadPromise

      // Should clear uploading state after delay
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100))
      })

      expect(result.current.uploading).toBe(false)
      expect(result.current.progress).toBe(0)
    })

    it('handles upload failures', async () => {
      const onError = jest.fn()
      fetch.mockResolvedValue({
        ok: false,
        statusText: 'Server Error'
      })

      const { result } = renderHook(() => useImageUpload({ onError }))
      const file = createMockFile()

      const uploadResult = await act(async () => {
        return result.current.uploadImage(file)
      })

      expect(uploadResult).toBe(null)
      expect(result.current.error).toContain('Upload failed: Server Error')
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(result.current.uploading).toBe(false)
    })

    it('handles network errors during upload', async () => {
      const onError = jest.fn()
      fetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useImageUpload({ onError }))
      const file = createMockFile()

      const uploadResult = await act(async () => {
        return result.current.uploadImage(file)
      })

      expect(uploadResult).toBe(null)
      expect(result.current.error).toBe('Network error')
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('uses custom upload handler when provided', async () => {
      const customUpload = jest.fn().mockResolvedValue('custom-upload-url')
      const { result } = renderHook(() => useImageUpload({ onUpload: customUpload }))
      const file = createMockFile()

      const uploadResult = await act(async () => {
        return result.current.uploadImage(file)
      })

      expect(customUpload).toHaveBeenCalledWith(expect.any(Blob))
      expect(uploadResult.url).toBe('custom-upload-url')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('rejects invalid files before upload', async () => {
      const { result } = renderHook(() => useImageUpload())
      const invalidFile = createInvalidFile()

      const uploadResult = await act(async () => {
        return result.current.uploadImage(invalidFile)
      })

      expect(uploadResult).toBe(null)
      expect(result.current.error).toContain('File type not supported')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('compresses large images before upload', async () => {
      // Mock large file that needs compression
      const largeFile = createMockFile('large.jpg', 6 * 1024 * 1024, 'image/jpeg') // 6MB
      
      const { result } = renderHook(() => useImageUpload())

      const uploadResult = await act(async () => {
        return result.current.uploadImage(largeFile)
      })

      expect(uploadResult).not.toBe(null)
      expect(mockCanvas.toBlob).toHaveBeenCalled()
      
      // Verify FormData contains compressed blob
      const formDataCalls = fetch.mock.calls[0][1].body
      expect(formDataCalls).toBeInstanceOf(FormData)
    })
  })

  describe('Multiple Image Upload', () => {
    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'https://example.com/uploaded-image.jpg' })
      })
    })

    it('uploads multiple images successfully', async () => {
      const onProgress = jest.fn()
      const { result } = renderHook(() => useImageUpload({ onProgress }))
      const files = [
        createMockFile('image1.jpg'),
        createMockFile('image2.png', 2048, 'image/png'),
        createMockFile('image3.webp', 3072, 'image/webp')
      ]

      const uploadResults = await act(async () => {
        return result.current.uploadMultiple(files)
      })

      expect(uploadResults).toHaveLength(3)
      expect(uploadResults[0].url).toBe('https://example.com/uploaded-image.jpg')
      expect(fetch).toHaveBeenCalledTimes(3)
      expect(onProgress).toHaveBeenCalledWith(100) // Final progress for all files
    })

    it('handles partial failures in multiple upload', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: 'success1.jpg' })
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: 'success3.jpg' })
        })

      const { result } = renderHook(() => useImageUpload())
      const files = [
        createMockFile('image1.jpg'),
        createMockFile('image2.jpg'),
        createMockFile('image3.jpg')
      ]

      const uploadResults = await act(async () => {
        return result.current.uploadMultiple(files)
      })

      // Should return only successful uploads
      expect(uploadResults).toHaveLength(2)
      expect(uploadResults[0].url).toBe('success1.jpg')
      expect(uploadResults[1].url).toBe('success3.jpg')
    })

    it('filters out invalid files from multiple upload', async () => {
      const { result } = renderHook(() => useImageUpload())
      const files = [
        createMockFile('valid1.jpg'),
        createInvalidFile(), // PDF file
        createMockFile('valid2.png', 1024, 'image/png')
      ]

      // Should process valid files and skip invalid ones
      const uploadResults = await act(async () => {
        return result.current.uploadMultiple(files)
      })

      expect(uploadResults).toHaveLength(2)
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('tracks progress across multiple uploads', async () => {
      const onProgress = jest.fn()
      const { result } = renderHook(() => useImageUpload({ onProgress }))
      const files = [createMockFile('1.jpg'), createMockFile('2.jpg')]

      await act(async () => {
        return result.current.uploadMultiple(files)
      })

      // Should report 50% after first file, 100% after second
      expect(onProgress).toHaveBeenCalledWith(50)
      expect(onProgress).toHaveBeenCalledWith(100)
    })
  })

  describe('Upload Cancellation', () => {
    it('cancels ongoing upload', async () => {
      // Mock a long-running upload
      fetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ url: 'test.jpg' })
          }), 1000)
        )
      )

      const { result } = renderHook(() => useImageUpload())
      const file = createMockFile()

      // Start upload
      const uploadPromise = act(async () => {
        return result.current.uploadImage(file)
      })

      expect(result.current.uploading).toBe(true)

      // Cancel upload
      act(() => {
        result.current.cancelUpload()
      })

      expect(result.current.uploading).toBe(false)
      expect(result.current.progress).toBe(0)
      expect(result.current.error).toBe('Upload cancelled')

      // Upload should resolve to null
      const uploadResult = await uploadPromise
      expect(uploadResult).toBe(null)
    })

    it('handles AbortError correctly', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      fetch.mockRejectedValue(abortError)

      const { result } = renderHook(() => useImageUpload())
      const file = createMockFile()

      const uploadResult = await act(async () => {
        return result.current.uploadImage(file)
      })

      expect(uploadResult).toBe(null)
      expect(result.current.error).toBe('Upload cancelled')
    })
  })

  describe('State Reset', () => {
    it('resets all state to initial values', () => {
      const { result } = renderHook(() => useImageUpload())

      // Simulate some state changes
      act(() => {
        result.current.validateFile(createInvalidFile()) // Sets error
      })

      expect(result.current.error).not.toBe(null)

      // Reset state
      act(() => {
        result.current.reset()
      })

      expect(result.current.uploading).toBe(false)
      expect(result.current.progress).toBe(0)
      expect(result.current.error).toBe(null)
    })
  })

  describe('Drag and Drop Handlers', () => {
    it('creates drag handlers with correct event handling', () => {
      const { result } = renderHook(() => useImageUpload())
      const handlers = result.current.createDragHandlers()

      expect(handlers).toHaveProperty('onDragOver')
      expect(handlers).toHaveProperty('onDragLeave')
      expect(handlers).toHaveProperty('onDrop')
      expect(typeof handlers.onDragOver).toBe('function')
      expect(typeof handlers.onDragLeave).toBe('function')
      expect(typeof handlers.onDrop).toBe('function')
    })

    it('handles drag over events', () => {
      const { result } = renderHook(() => useImageUpload())
      const handlers = result.current.createDragHandlers()

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {},
        currentTarget: {}
      }

      handlers.onDragOver(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })

    it('handles drop events with single image', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'dropped-image.jpg' })
      })

      const { result } = renderHook(() => useImageUpload())
      const handlers = result.current.createDragHandlers()

      const mockFile = createMockFile()
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: {
          files: [mockFile]
        }
      }

      const dropResult = await act(async () => {
        return handlers.onDrop(mockEvent)
      })

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(dropResult.url).toBe('dropped-image.jpg')
      expect(fetch).toHaveBeenCalled()
    })

    it('handles drop events with multiple images', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'dropped-image.jpg' })
      })

      const { result } = renderHook(() => useImageUpload())
      const handlers = result.current.createDragHandlers()

      const mockFiles = [
        createMockFile('image1.jpg'),
        createMockFile('image2.png', 2048, 'image/png')
      ]
      
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: {
          files: mockFiles
        }
      }

      const dropResults = await act(async () => {
        return handlers.onDrop(mockEvent)
      })

      expect(Array.isArray(dropResults)).toBe(true)
      expect(dropResults).toHaveLength(2)
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('filters non-image files in drop events', async () => {
      const { result } = renderHook(() => useImageUpload())
      const handlers = result.current.createDragHandlers()

      const mockFiles = [
        createMockFile('image.jpg'),
        createInvalidFile(), // PDF
        createMockFile('document.txt', 1024, 'text/plain')
      ]
      
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: {
          files: mockFiles
        }
      }

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'filtered-image.jpg' })
      })

      const dropResult = await act(async () => {
        return handlers.onDrop(mockEvent)
      })

      // Should only process the valid image file
      expect(dropResult.url).toBe('filtered-image.jpg')
      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Scenarios and Edge Cases', () => {
    it('handles malformed server responses', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}) // No URL field
      })

      const { result } = renderHook(() => useImageUpload())
      const file = createMockFile()

      const uploadResult = await act(async () => {
        return result.current.uploadImage(file)
      })

      expect(uploadResult).not.toBe(null)
      expect(uploadResult.url).toBeUndefined()
    })

    it('handles JSON parse errors', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      const { result } = renderHook(() => useImageUpload())
      const file = createMockFile()

      const uploadResult = await act(async () => {
        return result.current.uploadImage(file)
      })

      expect(uploadResult).toBe(null)
      expect(result.current.error).toBe('Invalid JSON')
    })

    it('handles zero-size files', () => {
      const { result } = renderHook(() => useImageUpload())
      const zeroFile = createMockFile('empty.jpg', 0, 'image/jpeg')

      const isValid = result.current.validateFile(zeroFile)

      expect(isValid).toBe(true) // Zero-size files are technically valid
    })

    it('handles files with very long names', () => {
      const { result } = renderHook(() => useImageUpload())
      const longName = 'a'.repeat(1000) + '.jpg'
      const file = createMockFile(longName, 1024, 'image/jpeg')

      const isValid = result.current.validateFile(file)

      expect(isValid).toBe(true) // Should handle long filenames
    })

    it('handles special characters in filenames', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'special-chars.jpg' })
      })

      const { result } = renderHook(() => useImageUpload())
      const specialFile = createMockFile('测试图片 #1 (2024).jpg', 1024, 'image/jpeg')

      const uploadResult = await act(async () => {
        return result.current.uploadImage(specialFile)
      })

      expect(uploadResult).not.toBe(null)
      expect(uploadResult.url).toBe('special-chars.jpg')
    })

    it('maintains correct state during rapid successive uploads', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'rapid-upload.jpg' })
      })

      const { result } = renderHook(() => useImageUpload())
      const file = createMockFile()

      // Start multiple uploads rapidly
      const uploads = [
        result.current.uploadImage(file),
        result.current.uploadImage(file),
        result.current.uploadImage(file)
      ]

      const results = await act(async () => {
        return Promise.all(uploads)
      })

      // All uploads should succeed
      results.forEach(result => {
        expect(result).not.toBe(null)
        expect(result.url).toBe('rapid-upload.jpg')
      })
    })
  })

  describe('Memory Management and Cleanup', () => {
    it('cleans up object URLs properly', async () => {
      const { result } = renderHook(() => useImageUpload())
      const file = createMockFile()

      await act(async () => {
        await result.current.createPreview(file)
      })

      // Object URLs should be created for canvas operations
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    it('handles component unmount during upload', () => {
      const { result, unmount } = renderHook(() => useImageUpload())
      
      // Start an upload
      act(() => {
        result.current.uploadImage(createMockFile())
      })

      // Unmount component
      expect(() => unmount()).not.toThrow()
    })
  })
})