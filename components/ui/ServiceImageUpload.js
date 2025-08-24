'use client'

import { useState, useCallback } from 'react'
import { 
  PhotoIcon, 
  ArrowUpTrayIcon, 
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

export default function ServiceImageUpload({ 
  currentImageUrl = '', 
  onImageChange, 
  serviceId = null,
  className = '' 
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [imagePreview, setImagePreview] = useState(currentImageUrl)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Handle file selection
  const handleFileSelect = useCallback(async (file) => {
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)

    // Upload file
    await uploadImage(file)
  }, [serviceId])

  // Upload image to server
  const uploadImage = async (file) => {
    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (serviceId) {
        formData.append('service_id', serviceId)
      }

      // Simulate upload progress (since we don't have real progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 20, 90))
      }, 200)

      const response = await fetch('/api/upload/service-image', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      // Update parent component with new URL
      onImageChange(result.url)
      setImagePreview(result.url)
      
      toast.success('Image uploaded successfully!')

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload image')
      
      // Reset preview on error
      setImagePreview(currentImageUrl)
      
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // Handle file input change
  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // Remove current image
  const handleRemoveImage = () => {
    setImagePreview('')
    onImageChange('')
    toast.success('Image removed')
  }

  // Handle manual URL input
  const handleUrlChange = (url) => {
    setImagePreview(url)
    onImageChange(url)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Image Preview */}
      {imagePreview && (
        <div className="relative">
          <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
            <img 
              src={imagePreview} 
              alt="Service preview"
              className="w-full h-full object-cover"
              onError={() => {
                setImagePreview('')
                onImageChange('')
                toast.error('Invalid image URL')
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            title="Remove image"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragOver 
            ? 'border-olive-500 bg-olive-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          {uploading ? (
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto"></div>
              <p className="text-sm text-gray-600">Uploading image...</p>
              {uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-olive-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          ) : (
            <>
              <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="service-image-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    {dragOver ? 'Drop image here' : 'Upload service image'}
                  </span>
                  <input
                    id="service-image-upload"
                    name="service-image-upload"
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleInputChange}
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Drag and drop or click to select • PNG, JPG, GIF up to 10MB
                </p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => document.getElementById('service-image-upload').click()}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Choose Image
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Manual URL Input */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Or paste image URL
        </label>
        <input
          type="url"
          value={imagePreview || ''}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-sm"
          placeholder="https://example.com/service-image.jpg"
          disabled={uploading}
        />
      </div>

      {/* Image Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex">
          <PhotoIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Image Guidelines
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Use high-quality photos showing the service result</li>
              <li>• Recommended: 16:9 aspect ratio (e.g., 1600x900px)</li>
              <li>• Keep file size under 10MB for fast loading</li>
              <li>• Professional photos improve booking rates by 40%</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}