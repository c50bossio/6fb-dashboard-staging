'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback, useMemo, memo, Suspense, lazy } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { useCustomizationForm } from '@/hooks/useCustomizationForm'
import { useDebounce } from '@/hooks/useDebounce'
import { useImageUpload } from '@/hooks/useImageUpload'
import { barberProfileSchema, validateForm } from '@/lib/validation/customization-schemas'

// Lazy load heavy components
const ImageUpload = lazy(() => import('@/components/ui/ImageUpload'))
const ConfirmationDialog = lazy(() => import('@/components/ui/ConfirmationDialog'))
const SaveChangesDialog = lazy(() => import('@/components/ui/ConfirmationDialog').then(module => ({ default: module.SaveChangesDialog })))
const DiscardChangesDialog = lazy(() => import('@/components/ui/ConfirmationDialog').then(module => ({ default: module.DiscardChangesDialog })))

import { 
  UserCircleIcon,
  CalendarDaysIcon,
  SparklesIcon,
  PaintBrushIcon,
  CheckCircleIcon,
  XMarkIcon,
  StarIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  PhotoIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

// Default settings with proper structure
const defaultSettings = {
  full_name: '',
  bio: '',
  phone: '',
  instagram_handle: '',
  years_experience: 0,
  specializations: [],
  profile_image_url: '',
  portfolio_images: [],
  preferred_hours: {
    monday: { start: '09:00', end: '17:00', available: true },
    tuesday: { start: '09:00', end: '17:00', available: true },
    wednesday: { start: '09:00', end: '17:00', available: true },
    thursday: { start: '09:00', end: '17:00', available: true },
    friday: { start: '09:00', end: '17:00', available: true },
    saturday: { start: '09:00', end: '15:00', available: true },
    sunday: { start: '10:00', end: '14:00', available: false }
  },
  booking_buffer_minutes: 15,
  max_bookings_per_day: 8,
  profile_theme: 'professional',
  show_reviews: true,
  show_experience: true,
  show_specializations: true,
  custom_booking_url: '',
  services_offered: [],
  pricing_display: 'range',
  social_links: {
    instagram: '',
    tiktok: '',
    facebook: '',
    website: ''
  }
}

// Memoized tab configuration
const tabs = [
  { id: 'profile', name: 'Profile Info', icon: UserCircleIcon, description: 'Personal info & bio' },
  { id: 'photos', name: 'Photos', icon: PhotoIcon, description: 'Profile & portfolio' },
  { id: 'services', name: 'Services', icon: SparklesIcon, description: 'Specializations & pricing' },
  { id: 'availability', name: 'Availability', icon: CalendarDaysIcon, description: 'Hours & booking' },
  { id: 'branding', name: 'Branding', icon: PaintBrushIcon, description: 'Theme & links' }
]

// Memoized specialization options
const specializationOptions = [
  'Classic Cuts', 'Fades', 'Beard Trimming', 'Straight Razor Shaves',
  'Hair Washing', 'Styling', 'Color Services', 'Kids Cuts',
  'Senior Cuts', 'Wedding Prep', 'Hot Towel Service', 'Scalp Treatments',
  'Design Cuts', 'Afro Cuts', 'Curly Hair Specialist', 'Extensions'
]

// Memoized service options
const serviceOptions = [
  { name: 'Haircut', price: 25, duration: 30 },
  { name: 'Haircut & Beard', price: 35, duration: 45 },
  { name: 'Beard Trim', price: 15, duration: 15 },
  { name: 'Straight Razor Shave', price: 30, duration: 30 },
  { name: 'Hot Towel Treatment', price: 20, duration: 20 },
  { name: 'Design Cut', price: 45, duration: 60 }
]

// Memoized theme options
const profileThemes = [
  { id: 'professional', name: 'Professional', colors: { primary: '#1f2937', secondary: '#4f46e5' } },
  { id: 'modern', name: 'Modern', colors: { primary: '#0f172a', secondary: '#06b6d4' } },
  { id: 'classic', name: 'Classic', colors: { primary: '#7c2d12', secondary: '#d97706' } },
  { id: 'bold', name: 'Bold', colors: { primary: '#991b1b', secondary: '#dc2626' } }
]

// Memoized skeleton component for loading states
const ProfileSkeleton = memo(function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  )
})

// Memoized error boundary wrapper
const ErrorBoundaryWrapper = memo(function ErrorBoundaryWrapper({ children, fallback }) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      {children}
    </Suspense>
  )
})

function BarberProfileCustomizationOptimized({ onUnsavedChanges }) {
  const { user } = useAuth()
  const router = useRouter()
  
  // State management with custom hook
  const {
    settings,
    isLoading,
    isSaving,
    isAutoSaving,
    errors,
    hasUnsavedChanges,
    updateSetting,
    updateSettings,
    save,
    load,
    reset,
    validate
  } = useCustomizationForm(defaultSettings, {
    tableName: 'profiles',
    autoSaveDelay: 5000,
    enableUndo: true,
    onUnsavedChanges,
    onSave: useCallback((data) => {
      
    }, []),
    onError: useCallback((error) => {
      console.error('Profile error:', error)
    }, [])
  })

  // Image upload hook
  const {
    uploadImage,
    uploading: imageUploading,
    progress: uploadProgress,
    error: uploadError
  } = useImageUpload({
    maxSize: 5 * 1024 * 1024,
    maxWidth: 1200,
    maxHeight: 1200,
    onUpload: useCallback(async (file) => {
      // Mock upload for now
      return URL.createObjectURL(file)
    }, [])
  })

  // Local state
  const [activeTab, setActiveTab] = useState('profile')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [previewMode, setPreviewMode] = useState('desktop')
  const [message, setMessage] = useState({ type: '', text: '' })

  // Debounced validation for real-time feedback
  const debouncedSettings = useDebounce(settings, 300)
  
  // Memoized validation result
  const validationResult = useMemo(() => {
    return validateForm(barberProfileSchema, debouncedSettings)
  }, [debouncedSettings])

  // Optimized image upload handler
  const handleImageUpload = useCallback(async (file) => {
    try {
      const result = await uploadImage(file)
      if (result) {
        updateSetting('profile_image_url', result.url)
        return result.url
      }
    } catch (error) {
      console.error('Image upload failed:', error)
      throw error
    }
  }, [uploadImage, updateSetting])

  // Optimized portfolio image upload
  const handlePortfolioImageUpload = useCallback(async (file) => {
    try {
      const result = await uploadImage(file)
      if (result) {
        const newImages = [...settings.portfolio_images, result.url]
        updateSetting('portfolio_images', newImages)
        return result.url
      }
    } catch (error) {
      console.error('Portfolio upload failed:', error)
      throw error
    }
  }, [uploadImage, settings.portfolio_images, updateSetting])

  // Optimized save handler with validation
  const handleSave = useCallback(async () => {
    try {
      // Validate before saving
      if (!validate(barberProfileSchema)) {
        setMessage({ 
          type: 'error', 
          text: 'Please fix validation errors before saving' 
        })
        return
      }

      await save()
      setMessage({ 
        type: 'success', 
        text: 'Profile settings saved successfully!' 
      })
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Save failed:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to save settings. Please try again.' 
      })
    }
  }, [validate, save])

  // Optimized discard handler
  const handleDiscard = useCallback(() => {
    reset()
    setShowDiscardDialog(false)
    setMessage({ type: 'info', text: 'Changes discarded' })
    setTimeout(() => setMessage({ type: '', text: '' }), 2000)
  }, [reset])

  // Navigate to settings handler
  const navigateToSettings = useCallback((path) => {
    router.push(`/shop/settings/${path}`)
  }, [router])

  // Memoized tab content renderer
  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case 'profile':
        return <ProfileInfoTab settings={settings} updateSetting={updateSetting} errors={errors} />
      case 'photos':
        return (
          <PhotosTab
            settings={settings}
            updateSetting={updateSetting}
            onImageUpload={handleImageUpload}
            onPortfolioUpload={handlePortfolioImageUpload}
            uploading={imageUploading}
            uploadProgress={uploadProgress}
            uploadError={uploadError}
          />
        )
      case 'services':
        return (
          <ServicesTab
            settings={settings}
            updateSetting={updateSetting}
            specializationOptions={specializationOptions}
            serviceOptions={serviceOptions}
            errors={errors}
          />
        )
      case 'availability':
        return <AvailabilityTab navigateToSettings={navigateToSettings} />
      case 'branding':
        return (
          <BrandingTab
            settings={settings}
            updateSetting={updateSetting}
            profileThemes={profileThemes}
            errors={errors}
          />
        )
      default:
        return null
    }
  }, [
    activeTab,
    settings,
    updateSetting,
    errors,
    handleImageUpload,
    handlePortfolioImageUpload,
    imageUploading,
    uploadProgress,
    uploadError,
    navigateToSettings,
    specializationOptions,
    serviceOptions,
    profileThemes
  ])

  // Memoized preview component
  const previewComponent = useMemo(() => (
    <LivePreview
      settings={settings}
      previewMode={previewMode}
      setPreviewMode={setPreviewMode}
    />
  ), [settings, previewMode])

  if (isLoading) {
    return <ProfileSkeleton />
  }

  return (
    <ErrorBoundaryWrapper>
      {/* Confirmation Dialogs */}
      <Suspense fallback={null}>
        <SaveChangesDialog
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          onSave={handleSave}
          hasChanges={hasUnsavedChanges}
        />
        
        <DiscardChangesDialog
          isOpen={showDiscardDialog}
          onClose={() => setShowDiscardDialog(false)}
          onDiscard={handleDiscard}
        />
      </Suspense>

      <div className="space-y-6">
        {/* Enhanced Tab Navigation */}
        <TabNavigation 
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Auto-save indicator */}
        <AutoSaveIndicator
          isAutoSaving={isAutoSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={() => setShowSaveDialog(true)}
          onDiscard={() => setShowDiscardDialog(true)}
        />

        {/* Validation Errors */}
        {!validationResult.success && Object.keys(validationResult.errors).length > 0 && (
          <ValidationErrors errors={validationResult.errors} />
        )}

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            <ErrorBoundaryWrapper>
              {renderTabContent}
            </ErrorBoundaryWrapper>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <ErrorBoundaryWrapper>
              {previewComponent}
            </ErrorBoundaryWrapper>
          </div>
        </div>

        {/* Enhanced Save Section */}
        <SaveSection
          message={message}
          handleSave={handleSave}
          handleDiscard={() => setShowDiscardDialog(true)}
          isSaving={isSaving}
          isAutoSaving={isAutoSaving}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>
    </ErrorBoundaryWrapper>
  )
}

// Memoized sub-components to prevent unnecessary re-renders

const TabNavigation = memo(function TabNavigation({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="border-b border-gray-200 bg-white rounded-lg p-1 shadow-sm">
      <nav className="-mb-px flex space-x-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 py-2 px-3 rounded-md border-b-2 font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <div className="text-left">
                <div>{tab.name}</div>
                <div className="text-xs text-gray-400 hidden sm:block">{tab.description}</div>
              </div>
            </button>
          )
        })}
      </nav>
    </div>
  )
})

const AutoSaveIndicator = memo(function AutoSaveIndicator({ 
  isAutoSaving, 
  hasUnsavedChanges, 
  onSave, 
  onDiscard 
}) {
  if (!isAutoSaving && !hasUnsavedChanges) return null

  return (
    <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
      <div className="flex items-center gap-2">
        {isAutoSaving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-700">Auto-saving changes...</span>
          </>
        ) : (
          <>
            <ClockIcon className="h-4 w-4 text-orange-600" />
            <span className="text-orange-700">You have unsaved changes</span>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Save Now
        </button>
        <button
          onClick={onDiscard}
          className="text-gray-600 hover:text-gray-800"
        >
          Discard
        </button>
      </div>
    </div>
  )
})

const ValidationErrors = memo(function ValidationErrors({ errors }) {
  const errorEntries = Object.entries(errors)
  if (errorEntries.length === 0) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h4 className="text-red-800 font-medium mb-2">Please fix the following errors:</h4>
      <ul className="text-sm text-red-700 space-y-1">
        {errorEntries.map(([field, error]) => (
          <li key={field}>• {field.replace(/_/g, ' ')}: {error}</li>
        ))}
      </ul>
    </div>
  )
})

// Lazy load tab content components for better performance
const ProfileInfoTab = lazy(() => import('./tabs/ProfileInfoTab'))
const PhotosTab = lazy(() => import('./tabs/PhotosTab'))
const ServicesTab = lazy(() => import('./tabs/ServicesTab'))
const AvailabilityTab = lazy(() => import('./tabs/AvailabilityTab'))
const BrandingTab = lazy(() => import('./tabs/BrandingTab'))
const LivePreview = lazy(() => import('./tabs/LivePreview'))
const SaveSection = lazy(() => import('./tabs/SaveSection'))

export default memo(BarberProfileCustomizationOptimized)