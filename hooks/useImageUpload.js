'use client'

import { useState, useCallback, useRef } from 'react'

/**
 * Custom hook for handling image uploads with optimization
 * Includes validation, compression, and progress tracking
 */
export function useImageUpload(options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    uploadEndpoint = '/api/upload',
    onUpload,
    onError,
    onProgress
  } = options

  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef()

  // Validate file before processing
  const validateFile = useCallback((file) => {
    setError(null)

    if (!file) {
      setError('No file selected')
      return false
    }

    if (!acceptedTypes.includes(file.type)) {
      setError(`File type not supported. Accepted types: ${acceptedTypes.join(', ')}`)
      return false
    }

    if (file.size > maxSize) {
      setError(`File size too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`)
      return false
    }

    return true
  }, [acceptedTypes, maxSize])

  // Compress image if needed
  const compressImage = useCallback((file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        const aspectRatio = width / height

        if (width > maxWidth) {
          width = maxWidth
          height = width / aspectRatio
        }

        if (height > maxHeight) {
          height = maxHeight
          width = height * aspectRatio
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => resolve(blob),
          file.type,
          quality
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }, [maxWidth, maxHeight, quality])

  // Generate preview URL
  const createPreview = useCallback((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.readAsDataURL(file)
    })
  }, [])

  // Upload file to server
  const uploadToServer = useCallback(async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('timestamp', Date.now().toString())

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      body: formData,
      signal: abortControllerRef.current.signal,
      // Add upload progress tracking if XMLHttpRequest is needed
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.url || result.data?.url || result.path
  }, [uploadEndpoint])

  // Main upload function
  const uploadImage = useCallback(async (file) => {
    if (!validateFile(file)) return null

    try {
      setUploading(true)
      setProgress(0)
      setError(null)

      // Step 1: Create preview (10%)
      const preview = await createPreview(file)
      setProgress(10)
      if (onProgress) onProgress(10)

      // Step 2: Compress if needed (40%)
      let processedFile = file
      if (file.size > maxSize / 2 || file.width > maxWidth || file.height > maxHeight) {
        processedFile = await compressImage(file)
        setProgress(40)
        if (onProgress) onProgress(40)
      }

      // Step 3: Upload to server (90%)
      let uploadUrl
      if (onUpload) {
        uploadUrl = await onUpload(processedFile)
      } else {
        uploadUrl = await uploadToServer(processedFile)
      }
      setProgress(90)
      if (onProgress) onProgress(90)

      // Step 4: Complete (100%)
      setProgress(100)
      if (onProgress) onProgress(100)

      // Clean up progress after delay
      setTimeout(() => {
        setProgress(0)
        setUploading(false)
      }, 1000)

      return {
        url: uploadUrl,
        preview,
        file: processedFile,
        originalFile: file,
        size: processedFile.size,
        type: processedFile.type
      }

    } catch (error) {
      console.error('Upload error:', error)
      
      if (error.name === 'AbortError') {
        setError('Upload cancelled')
      } else {
        setError(error.message || 'Upload failed')
      }
      
      if (onError) onError(error)
      
      setUploading(false)
      setProgress(0)
      return null
    }
  }, [
    validateFile, 
    createPreview, 
    compressImage, 
    uploadToServer, 
    onUpload, 
    onProgress, 
    onError,
    maxSize,
    maxWidth,
    maxHeight
  ])

  // Upload multiple images
  const uploadMultiple = useCallback(async (files) => {
    const results = []
    const totalFiles = files.length

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await uploadImage(files[i])
        if (result) {
          results.push(result)
        }
        
        // Update overall progress
        const overallProgress = ((i + 1) / totalFiles) * 100
        if (onProgress) onProgress(overallProgress)
      } catch (error) {
        console.error(`Failed to upload file ${i + 1}:`, error)
        results.push(null)
      }
    }

    return results.filter(Boolean)
  }, [uploadImage, onProgress])

  // Cancel current upload
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setUploading(false)
    setProgress(0)
    setError('Upload cancelled')
  }, [])

  // Reset state
  const reset = useCallback(() => {
    setUploading(false)
    setProgress(0)
    setError(null)
  }, [])

  // Drag and drop handlers
  const createDragHandlers = useCallback(() => {
    return {
      onDragOver: (e) => {
        e.preventDefault()
        e.stopPropagation()
      },
      onDragLeave: (e) => {
        e.preventDefault()
        e.stopPropagation()
      },
      onDrop: async (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        const files = Array.from(e.dataTransfer.files)
        const imageFiles = files.filter(file => 
          acceptedTypes.includes(file.type)
        )
        
        if (imageFiles.length === 1) {
          return await uploadImage(imageFiles[0])
        } else if (imageFiles.length > 1) {
          return await uploadMultiple(imageFiles)
        }
      }
    }
  }, [uploadImage, uploadMultiple, acceptedTypes])

  return {
    // State
    uploading,
    progress,
    error,
    
    // Actions
    uploadImage,
    uploadMultiple,
    cancelUpload,
    reset,
    validateFile,
    compressImage,
    createPreview,
    
    // Utilities
    createDragHandlers,
    
    // Configuration
    maxSize,
    acceptedTypes,
    maxWidth,
    maxHeight,
    quality
  }
}

export default useImageUpload