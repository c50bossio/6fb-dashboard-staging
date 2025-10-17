'use client'

import { 
  PhotoIcon, 
  CloudArrowUpIcon, 
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { useState, useRef, useCallback } from 'react'

export default function ImageUpload({
  onUpload,
  onRemove,
  currentImage = null,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB default
  className = "",
  label = "Upload Image",
  description = "Drag and drop or click to upload",
  showPreview = true,
  aspectRatio = "square", // square, landscape, portrait
  disabled = false
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(currentImage)
  const fileInputRef = useRef(null)

  const aspectRatioClasses = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]'
  }

  const validateFile = useCallback((file) => {
    setError('')
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return false
    }

    // Check file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`)
      return false
    }

    return true
  }, [maxSize])

  const handleFileSelect = useCallback(async (file) => {
    if (!validateFile(file)) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(file)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      // Call upload handler
      const result = await onUpload(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
      }, 500)

    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed. Please try again.')
      setUploading(false)
      setUploadProgress(0)
      setPreview(currentImage)
    }
  }, [validateFile, onUpload, currentImage])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragOver(true)
  }, [disabled])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [disabled, handleFileSelect])

  const handleFileInputChange = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleRemove = useCallback(() => {
    setPreview(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (onRemove) {
      onRemove()
    }
  }, [onRemove])

  const openFileDialog = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {preview && !uploading && (
          <button
            onClick={handleRemove}
            className="text-sm text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"
            type="button"
          >
            <XMarkIcon className="w-4 h-4" />
            Remove
          </button>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${
          isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : disabled 
            ? 'border-gray-200 bg-gray-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${aspectRatioClasses[aspectRatio]}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Current Image Preview */}
        {preview && !uploading && (
          <div className="absolute inset-0 rounded-xl overflow-hidden">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
              <button
                onClick={openFileDialog}
                className="opacity-0 hover:opacity-100 transition-opacity bg-white bg-opacity-90 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium"
                type="button"
              >
                Change Image
              </button>
            </div>
          </div>
        )}

        {/* Upload Interface */}
        {!preview && (
          <div
            className="flex flex-col items-center justify-center h-full p-6 cursor-pointer"
            onClick={openFileDialog}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-all duration-200 ${
              isDragOver 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              <PhotoIcon className="w-6 h-6" />
            </div>
            
            <p className="text-base font-medium text-gray-900 mb-1">
              {isDragOver ? 'Drop your image here' : label}
            </p>
            <p className="text-sm text-gray-600 text-center">
              {description}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Max {Math.round(maxSize / (1024 * 1024))}MB • PNG, JPG, WebP
            </p>
          </div>
        )}

        {/* Upload Progress Overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center rounded-xl">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4 animate-pulse">
              <CloudArrowUpIcon className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-2">Uploading...</p>
            
            {/* Progress Bar */}
            <div className="w-3/4 bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">{uploadProgress}%</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute bottom-2 left-2 right-2 bg-red-50 border border-red-200 rounded-lg p-2">
            <div className="flex items-start gap-2">
              <ExclamationCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success State */}
        {preview && !uploading && !error && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Additional Info */}
      {showPreview && preview && !uploading && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
          <p>Image uploaded successfully. Changes will be saved when you submit the form.</p>
        </div>
      )}
    </div>
  )
}

// Utility function for uploading to a service
export const uploadImageToService = async (file, endpoint = '/api/upload') => {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  const result = await response.json()
  return result.url || result.data?.url
}