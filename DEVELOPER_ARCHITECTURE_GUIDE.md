# 6FB AI Agent System - Developer Architecture Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Architecture](#component-architecture)
3. [Custom Hooks Deep Dive](#custom-hooks-deep-dive)
4. [Performance Optimization](#performance-optimization)
5. [Testing Framework](#testing-framework)
6. [Security Implementation](#security-implementation)
7. [Database Design](#database-design)
8. [API Architecture](#api-architecture)
9. [Development Workflow](#development-workflow)
10. [Advanced Patterns](#advanced-patterns)

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    6FB AI Agent System                         │
│                   Customize Page Architecture                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   Next.js 14    │    │   FastAPI       │    │   PostgreSQL    │
│                 │    │   Python 3.9+   │    │   Supabase      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ React 18        │    │ SQLAlchemy      │    │ Row Level       │
│ TypeScript      │    │ Pydantic        │    │ Security (RLS)  │
│ Tailwind CSS    │    │ JWT Auth        │    │ Real-time       │
│ Zustand         │    │ WebSockets      │    │ Subscriptions   │
│ React Query     │    │ Celery          │    │ Vector Search   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────────────────────┼─────────────────────────────────┐
│                    Infrastructure Layer                         │
├─────────────────────────────────────────────────────────────────┤
│ Vercel (Frontend)  │  Render (Backend)  │  Supabase (Database) │
│ Cloudinary (CDN)   │  Redis (Cache)     │  Stripe (Payments)   │
│ Sentry (Monitoring)│  SendGrid (Email)  │  Pusher (WebSocket)  │
└─────────────────────────────────────────────────────────────────┘
```

### Architectural Principles

1. **Separation of Concerns**: Clear boundaries between UI, business logic, and data layers
2. **Performance First**: Optimized for speed with React.memo, lazy loading, and caching
3. **Scalability**: Designed to handle 10,000+ concurrent users
4. **Security**: Defense in depth with authentication, authorization, and input validation
5. **Maintainability**: Modular design with comprehensive testing and documentation

### Technology Stack Deep Dive

#### Frontend Technologies

```json
{
  "framework": "Next.js 14.0+",
  "runtime": "React 18",
  "language": "TypeScript 5.0+",
  "styling": "Tailwind CSS 3.3+",
  "state_management": "Zustand + React Query",
  "form_handling": "React Hook Form + Zod",
  "testing": "Jest + Testing Library + Playwright",
  "bundling": "Webpack 5 (via Next.js)",
  "deployment": "Vercel with Edge Runtime"
}
```

#### Backend Technologies

```json
{
  "framework": "FastAPI 0.104+",
  "language": "Python 3.9+",
  "orm": "SQLAlchemy 2.0+",
  "validation": "Pydantic 2.0+",
  "authentication": "JWT with refresh tokens",
  "websockets": "FastAPI WebSocket + Pusher",
  "background_tasks": "Celery + Redis",
  "testing": "pytest + httpx",
  "deployment": "Render with Docker"
}
```

---

## Component Architecture

### Component Hierarchy

```
app/(protected)/customize/page.js
├── CustomizationSection (wrapper component)
├── BarberProfileCustomization
│   ├── ProfileInfoTab
│   ├── PhotosTab
│   │   ├── ImageUpload
│   │   └── PortfolioGallery
│   ├── ServicesTab
│   │   ├── SpecializationSelector
│   │   └── ServicePricingManager
│   ├── AvailabilityTab
│   └── BrandingTab
│       ├── ThemeSelector
│       ├── SocialLinksManager
│       └── CustomURLGenerator
├── BarbershopWebsiteCustomization
│   ├── WebsiteDesignTab
│   ├── ContentManagementTab
│   ├── BusinessInfoTab
│   └── SEOOptimizationTab
├── EnterpriseWebsiteCustomization
│   ├── LocationOverviewTab
│   ├── BulkOperationsTab
│   ├── BrandConsistencyTab
│   └── AnalyticsDashboardTab
└── SharedComponents
    ├── LivePreview
    ├── SaveChangesDialog
    ├── DiscardChangesDialog
    └── TutorialOverlay
```

### Component Design Patterns

#### 1. Container/Presentational Pattern

**Container Component** (handles logic and state):
```javascript
// BarberProfileCustomization.js
export default function BarberProfileCustomization({ onUnsavedChanges }) {
  const { settings, updateSetting, save, isLoading } = useCustomizationForm(initialSettings)
  
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)
    trackEvent('tab_change', { tab: tabId })
  }, [])

  return (
    <BarberProfileView
      settings={settings}
      onSettingChange={updateSetting}
      onSave={save}
      isLoading={isLoading}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    />
  )
}
```

**Presentational Component** (pure UI):
```javascript
// BarberProfileView.js
export const BarberProfileView = React.memo(({
  settings,
  onSettingChange,
  onSave,
  isLoading,
  activeTab,
  onTabChange
}) => {
  return (
    <div className="customization-view">
      <TabNavigation activeTab={activeTab} onTabChange={onTabChange} />
      <TabContent 
        settings={settings}
        onSettingChange={onSettingChange}
        activeTab={activeTab}
      />
      <SaveActions onSave={onSave} isLoading={isLoading} />
    </div>
  )
})
```

#### 2. Compound Component Pattern

```javascript
// CustomizationSection compound component
const CustomizationSection = ({ children, title, isExpanded, onToggle }) => {
  return (
    <div className="customization-section">
      <CustomizationSection.Header 
        title={title} 
        isExpanded={isExpanded} 
        onToggle={onToggle} 
      />
      <CustomizationSection.Content isExpanded={isExpanded}>
        {children}
      </CustomizationSection.Content>
    </div>
  )
}

CustomizationSection.Header = ({ title, isExpanded, onToggle }) => (
  <button onClick={onToggle} className="section-header">
    <h3>{title}</h3>
    <ChevronIcon className={isExpanded ? 'rotate-90' : ''} />
  </button>
)

CustomizationSection.Content = ({ children, isExpanded }) => (
  <div className={`section-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
    {children}
  </div>
)
```

#### 3. Higher-Order Component Pattern

```javascript
// withSixFigureValidation HOC
export const withSixFigureValidation = (WrappedComponent) => {
  return function SixFigureValidatedComponent(props) {
    const [validationErrors, setValidationErrors] = useState({})
    
    const validateSixFigureCompliance = useCallback((data) => {
      const errors = SixFigureValidator.validate(data)
      setValidationErrors(errors)
      return Object.keys(errors).length === 0
    }, [])

    return (
      <WrappedComponent
        {...props}
        validationErrors={validationErrors}
        validateSixFigure={validateSixFigureCompliance}
      />
    )
  }
}

// Usage
const ValidatedBarberProfile = withSixFigureValidation(BarberProfileCustomization)
```

### Component Communication Patterns

#### 1. Props Down, Events Up

```javascript
// Parent component
const CustomizePage = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState({})
  
  const handleUnsavedChanges = useCallback((sectionId, hasChanges) => {
    setHasUnsavedChanges(prev => ({
      ...prev,
      [sectionId]: hasChanges
    }))
  }, [])

  return (
    <div>
      <BarberProfileCustomization 
        onUnsavedChanges={(hasChanges) => handleUnsavedChanges('barber', hasChanges)}
      />
      <SaveIndicator hasChanges={Object.values(hasUnsavedChanges).some(Boolean)} />
    </div>
  )
}
```

#### 2. Context for Shared State

```javascript
// CustomizationContext.js
const CustomizationContext = createContext()

export const CustomizationProvider = ({ children }) => {
  const [globalSettings, setGlobalSettings] = useState({})
  const [activeSection, setActiveSection] = useState('barber')
  
  const updateGlobalSetting = useCallback((key, value) => {
    setGlobalSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  return (
    <CustomizationContext.Provider value={{
      globalSettings,
      updateGlobalSetting,
      activeSection,
      setActiveSection
    }}>
      {children}
    </CustomizationContext.Provider>
  )
}

export const useCustomization = () => useContext(CustomizationContext)
```

#### 3. Event Bus for Cross-Component Communication

```javascript
// EventBus.js
class EventBus {
  constructor() {
    this.events = {}
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
    
    return () => this.off(event, callback)
  }
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data))
    }
  }
  
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    }
  }
}

export const eventBus = new EventBus()

// Usage in component
useEffect(() => {
  const unsubscribe = eventBus.on('template_applied', (templateData) => {
    // Handle template application
    applyTemplate(templateData)
  })
  
  return unsubscribe
}, [])
```

---

## Custom Hooks Deep Dive

### useCustomizationForm Hook

The core hook for form state management with comprehensive features:

#### Hook Implementation

```javascript
// useCustomizationForm.js
export function useCustomizationForm(initialSettings, options = {}) {
  const {
    tableName = 'profiles',
    autoSaveDelay = 5000,
    enableUndo = true,
    maxUndoSteps = 10,
    validationSchema,
    onSave,
    onError,
    onUnsavedChanges
  } = options

  // State management
  const [settings, setSettings] = useState(initialSettings)
  const [originalSettings, setOriginalSettings] = useState(initialSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Undo/Redo system
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])

  // Performance optimization refs
  const autoSaveTimeoutRef = useRef()
  const settingsRef = useRef(settings)
  const originalRef = useRef(originalSettings)

  // Update refs when state changes (for closure issues)
  useEffect(() => {
    settingsRef.current = settings
    originalRef.current = originalSettings
  }, [settings, originalSettings])

  // Derived state
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings)
  }, [settings, originalSettings])

  const canUndo = undoStack.length > 0
  const canRedo = redoStack.length > 0

  // Core update function with optimizations
  const updateSetting = useCallback((key, value, options = {}) => {
    const { skipUndo = false, skipValidation = false } = options

    setSettings(prev => {
      // Add to undo stack if enabled
      if (enableUndo && !skipUndo) {
        setUndoStack(stack => [prev, ...stack.slice(0, maxUndoSteps - 1)])
        setRedoStack([]) // Clear redo stack on new change
      }

      // Handle nested object updates
      if (key.includes('.')) {
        return updateNestedProperty(prev, key, value)
      }
      
      return { ...prev, [key]: value }
    })

    // Mark field as touched
    setTouched(prev => ({ ...prev, [key]: true }))

    // Validation
    if (!skipValidation && validationSchema) {
      validateField(key, value)
    }
  }, [enableUndo, maxUndoSteps, validationSchema])

  // Batch update for performance
  const updateSettings = useCallback((updates, options = {}) => {
    const { skipUndo = false } = options

    setSettings(prev => {
      if (enableUndo && !skipUndo) {
        setUndoStack(stack => [prev, ...stack.slice(0, maxUndoSteps - 1)])
        setRedoStack([])
      }
      return { ...prev, ...updates }
    })
    
    // Mark all updated fields as touched
    setTouched(prev => ({
      ...prev,
      ...Object.keys(updates).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    }))
  }, [enableUndo, maxUndoSteps])

  // Debounced auto-save implementation
  const scheduleAutoSave = useCallback(() => {
    if (!hasUnsavedChanges) return

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Schedule new auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsAutoSaving(true)
        await saveToDatabase(settingsRef.current)
        setOriginalSettings(structuredClone(settingsRef.current))
        if (onSave) onSave(settingsRef.current)
      } catch (error) {
        console.error('Auto-save failed:', error)
        if (onError) onError(error)
      } finally {
        setIsAutoSaving(false)
      }
    }, autoSaveDelay)
  }, [hasUnsavedChanges, autoSaveDelay, onSave, onError])

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges) {
      scheduleAutoSave()
    }
    
    // Notify parent of unsaved changes
    if (onUnsavedChanges) {
      onUnsavedChanges(hasUnsavedChanges)
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [hasUnsavedChanges, scheduleAutoSave, onUnsavedChanges])

  // Database operations
  const saveToDatabase = useCallback(async (dataToSave = settings) => {
    const { user } = useAuth()
    if (!user) throw new Error('User not authenticated')

    const supabase = createClient()
    const { error } = await supabase
      .from(tableName)
      .update({
        ...dataToSave,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) throw error
    return dataToSave
  }, [settings, tableName])

  // Manual save
  const save = useCallback(async () => {
    if (!hasUnsavedChanges) return settings

    try {
      setIsSaving(true)
      setErrors({})
      
      // Validate before saving
      if (validationSchema) {
        const validation = validationSchema.safeParse(settings)
        if (!validation.success) {
          const fieldErrors = {}
          validation.error.errors.forEach(error => {
            fieldErrors[error.path.join('.')] = error.message
          })
          setErrors(fieldErrors)
          throw new Error('Validation failed')
        }
      }
      
      const savedData = await saveToDatabase()
      setOriginalSettings(structuredClone(savedData))
      
      if (onSave) onSave(savedData)
      return savedData
    } catch (error) {
      console.error('Save failed:', error)
      if (onError) onError(error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [hasUnsavedChanges, settings, validationSchema, saveToDatabase, onSave, onError])

  // Undo functionality
  const undo = useCallback(() => {
    if (undoStack.length === 0) return

    const [previousState, ...remainingUndo] = undoStack
    setRedoStack(stack => [settings, ...stack.slice(0, maxUndoSteps - 1)])
    setUndoStack(remainingUndo)
    setSettings(previousState)
  }, [undoStack, settings, maxUndoSteps])

  // Redo functionality  
  const redo = useCallback(() => {
    if (redoStack.length === 0) return

    const [nextState, ...remainingRedo] = redoStack
    setUndoStack(stack => [settings, ...stack.slice(0, maxUndoSteps - 1)])
    setRedoStack(remainingRedo)
    setSettings(nextState)
  }, [redoStack, settings, maxUndoSteps])

  // Reset to original state
  const reset = useCallback(() => {
    setSettings(structuredClone(originalSettings))
    setErrors({})
    setTouched({})
    setUndoStack([])
    setRedoStack([])
  }, [originalSettings])

  // Field-level validation
  const validateField = useCallback((fieldName, value) => {
    if (!validationSchema) return true

    try {
      const fieldSchema = validationSchema.shape[fieldName]
      if (fieldSchema) {
        fieldSchema.parse(value)
        setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[fieldName]
          return newErrors
        })
        return true
      }
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: error.message
      }))
      return false
    }
  }, [validationSchema])

  return {
    // State
    settings,
    originalSettings,
    isLoading,
    isSaving,
    isAutoSaving,
    errors,
    touched,
    
    // Computed
    hasUnsavedChanges,
    canUndo,
    canRedo,
    
    // Actions
    updateSetting,
    updateSettings,
    save,
    reset,
    undo,
    redo,
    validateField,
    
    // Utilities
    setErrors,
    setTouched,
    setIsLoading
  }
}
```

#### Helper Functions

```javascript
// Utility for nested property updates
function updateNestedProperty(obj, path, value) {
  const keys = path.split('.')
  const result = structuredClone(obj)
  let current = result
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {}
    }
    current = current[keys[i]]
  }
  
  current[keys[keys.length - 1]] = value
  return result
}
```

### useImageUpload Hook

Specialized hook for handling image uploads with optimization:

```javascript
// useImageUpload.js
export function useImageUpload(options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    optimizeImages = true,
    generateThumbnails = true,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8
  } = options

  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  // File validation
  const validateFile = useCallback((file) => {
    if (!file) {
      throw new Error('No file provided')
    }

    if (!acceptedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not supported`)
    }

    if (file.size > maxSize) {
      throw new Error(`File size too large. Maximum ${maxSize / 1024 / 1024}MB allowed`)
    }

    return true
  }, [acceptedTypes, maxSize])

  // Image optimization
  const optimizeImage = useCallback((file) => {
    if (!optimizeImages) return Promise.resolve(file)

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(resolve, file.type, quality)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }, [optimizeImages, maxWidth, maxHeight, quality])

  // Upload function
  const uploadImage = useCallback(async (file, uploadOptions = {}) => {
    try {
      setUploading(true)
      setProgress(0)
      setError(null)

      // Validate file
      validateFile(file)

      // Generate preview
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)

      // Optimize if enabled
      const optimizedFile = await optimizeImage(file)
      
      // Create form data
      const formData = new FormData()
      formData.append('file', optimizedFile)
      formData.append('type', uploadOptions.type || 'general')
      formData.append('optimize', optimizeImages.toString())
      formData.append('generate_thumbnails', generateThumbnails.toString())

      if (uploadOptions.shopId) {
        formData.append('shop_id', uploadOptions.shopId)
      }

      // Upload with progress tracking
      const xhr = new XMLHttpRequest()
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'))
        })

        xhr.open('POST', '/api/customization/upload')
        xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`)
        xhr.send(formData)
      })

    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [validateFile, optimizeImage, optimizeImages, generateThumbnails])

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return {
    uploading,
    progress,
    error,
    previewUrl,
    uploadImage,
    validateFile
  }
}
```

### useDebounce Hook

Performance optimization hook for debouncing expensive operations:

```javascript
// useDebounce.js
export function useDebounce(value, delay, options = {}) {
  const {
    leading = false,
    trailing = true,
    maxWait = null
  } = options

  const [debouncedValue, setDebouncedValue] = useState(value)
  const timeoutRef = useRef()
  const maxTimeoutRef = useRef()
  const lastCallTimeRef = useRef(0)

  useEffect(() => {
    const currentTime = Date.now()
    
    // Leading edge execution
    if (leading && (currentTime - lastCallTimeRef.current) >= delay) {
      setDebouncedValue(value)
      lastCallTimeRef.current = currentTime
      return
    }

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current)
    }

    // Set up trailing execution
    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(value)
        lastCallTimeRef.current = Date.now()
      }, delay)
    }

    // Set up max wait execution
    if (maxWait && (currentTime - lastCallTimeRef.current) === 0) {
      maxTimeoutRef.current = setTimeout(() => {
        setDebouncedValue(value)
        lastCallTimeRef.current = Date.now()
      }, maxWait)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current)
      }
    }
  }, [value, delay, leading, trailing, maxWait])

  return debouncedValue
}

// Debounced callback variant
export function useDebouncedCallback(callback, delay, options = {}) {
  const callbackRef = useRef(callback)
  const timeoutRef = useRef()

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  )
}
```

---

## Performance Optimization

### React Performance Patterns

#### 1. Memoization Strategies

```javascript
// Component-level memoization
export const CustomizationSection = React.memo(({
  title,
  content,
  isExpanded,
  onToggle
}) => {
  return (
    <div className="customization-section">
      <SectionHeader title={title} isExpanded={isExpanded} onToggle={onToggle} />
      <SectionContent content={content} isExpanded={isExpanded} />
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.title === nextProps.title &&
    prevProps.isExpanded === nextProps.isExpanded &&
    deepEqual(prevProps.content, nextProps.content)
  )
})

// Hook-level memoization
const useExpensiveCalculation = (data, dependencies) => {
  return useMemo(() => {
    // Expensive calculation
    return processComplexData(data)
  }, dependencies)
}
```

#### 2. Lazy Loading and Code Splitting

```javascript
// Route-level code splitting
const LazyCustomizePage = lazy(() => 
  import('@/app/(protected)/customize/page')
    .then(module => ({ default: module.default }))
)

// Component-level lazy loading
const LazyTemplateGallery = lazy(() => 
  import('@/components/customization/TemplateGallery')
    .then(module => ({ default: module.TemplateGallery }))
)

// Usage with loading states
function CustomizePageWrapper() {
  return (
    <Suspense fallback={<CustomizePageSkeleton />}>
      <LazyCustomizePage />
    </Suspense>
  )
}

// Dynamic imports for heavy features
const loadAdvancedFeatures = async () => {
  const { ABTestingDashboard } = await import('@/components/customization/ABTestingDashboard')
  const { AdvancedAnalytics } = await import('@/components/customization/AdvancedAnalytics')
  
  return { ABTestingDashboard, AdvancedAnalytics }
}
```

#### 3. Virtual Scrolling for Large Lists

```javascript
// VirtualizedTemplateList.js
import { FixedSizeList as List } from 'react-window'

const VirtualizedTemplateList = ({ templates, onSelectTemplate }) => {
  const itemRenderer = useCallback(({ index, style }) => (
    <div style={style}>
      <TemplateCard
        template={templates[index]}
        onSelect={onSelectTemplate}
      />
    </div>
  ), [templates, onSelectTemplate])

  return (
    <List
      height={600}
      itemCount={templates.length}
      itemSize={200}
      itemData={templates}
    >
      {itemRenderer}
    </List>
  )
}
```

#### 4. Optimized Event Handlers

```javascript
// Debounced search with cancellation
const useOptimizedSearch = (searchFn, delay = 300) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const searchAbortControllerRef = useRef()

  const debouncedSearch = useDebouncedCallback(
    async (searchQuery) => {
      if (searchQuery.length < 2) {
        setResults([])
        return
      }

      // Cancel previous search
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort()
      }

      try {
        setIsSearching(true)
        searchAbortControllerRef.current = new AbortController()
        
        const searchResults = await searchFn(searchQuery, {
          signal: searchAbortControllerRef.current.signal
        })
        
        setResults(searchResults)
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Search failed:', error)
        }
      } finally {
        setIsSearching(false)
      }
    },
    delay
  )

  const handleSearch = useCallback((newQuery) => {
    setQuery(newQuery)
    debouncedSearch(newQuery)
  }, [debouncedSearch])

  return {
    query,
    results,
    isSearching,
    handleSearch
  }
}
```

### Bundle Optimization

#### 1. Tree Shaking Configuration

```javascript
// next.config.js
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Enable tree shaking
    config.optimization.usedExports = true
    config.optimization.sideEffects = false

    // Split chunks for better caching
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          customization: {
            test: /[\\/]components[\\/]customization[\\/]/,
            name: 'customization',
            chunks: 'all',
          }
        }
      }
    }

    return config
  },
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@heroicons/react', 'lodash']
  }
}
```

#### 2. Dynamic Imports Strategy

```javascript
// utils/dynamicImports.js
export const importComponent = async (componentPath) => {
  try {
    const module = await import(componentPath)
    return module.default || module
  } catch (error) {
    console.error(`Failed to load component: ${componentPath}`, error)
    return null
  }
}

// Preload critical components
export const preloadCustomizationComponents = () => {
  import('@/components/customization/BarberProfileCustomization')
  import('@/components/customization/BarbershopWebsiteCustomization')
}
```

### Memory Management

#### 1. Memory Leak Prevention

```javascript
// useMemoryOptimizedEffect.js
export const useMemoryOptimizedEffect = (effect, deps) => {
  const mountedRef = useRef(true)
  
  useEffect(() => {
    const cleanup = effect()
    
    return () => {
      mountedRef.current = false
      if (cleanup && typeof cleanup === 'function') {
        cleanup()
      }
    }
  }, deps)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return mountedRef
}

// Usage
const useOptimizedSubscription = (subscription) => {
  const mountedRef = useMemoryOptimizedEffect(() => {
    const unsubscribe = subscription.subscribe((data) => {
      if (mountedRef.current) {
        // Only update if component is still mounted
        handleData(data)
      }
    })
    
    return unsubscribe
  }, [subscription])
}
```

#### 2. Object Pool Pattern for Frequent Operations

```javascript
// ObjectPool.js
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.pool = []
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn())
    }
  }

  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop()
    }
    return this.createFn()
  }

  release(obj) {
    if (this.resetFn) {
      this.resetFn(obj)
    }
    this.pool.push(obj)
  }
}

// Usage for template processing
const templatePool = new ObjectPool(
  () => ({ id: null, data: null, processed: false }),
  (obj) => {
    obj.id = null
    obj.data = null
    obj.processed = false
  }
)
```

---

## Testing Framework

### Testing Architecture Overview

The customize page includes a comprehensive testing framework with 319 tests across 6 categories:

1. **Unit Tests** - Individual component and hook testing
2. **Integration Tests** - Component interaction and API integration
3. **Performance Tests** - Load testing and optimization validation
4. **Accessibility Tests** - WCAG compliance and usability
5. **Security Tests** - Authentication, authorization, and input validation
6. **E2E Tests** - Complete user journey testing

### Testing Setup and Configuration

#### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'components/customization/**/*.{js,jsx}',
    'hooks/use*.js',
    'app/(protected)/customize/**/*.{js,jsx}',
    '!**/*.test.{js,jsx}',
    '!**/*.stories.{js,jsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './components/customization/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    }
  },
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{js,jsx}',
    '<rootDir>/**/*.test.{js,jsx}',
  ]
}
```

#### Test Setup File

```javascript
// jest.setup.js
import '@testing-library/jest-dom'
import { server } from './mocks/server'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  usePathname() {
    return '/customize'
  },
  useSearchParams() {
    return new URLSearchParams()
  }
}))

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })
}))

// Start MSW server
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Unit Testing Patterns

#### Component Testing

```javascript
// __tests__/components/BarberProfileCustomization.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BarberProfileCustomization from '@/components/customization/BarberProfileCustomization'
import { AuthProvider } from '@/components/SupabaseAuthProvider'

// Test wrapper with providers
const renderWithProviders = (component, options = {}) => {
  const {
    user = { id: 'user-1', role: 'BARBER' },
    ...renderOptions
  } = options

  const Wrapper = ({ children }) => (
    <AuthProvider value={{ user, loading: false }}>
      {children}
    </AuthProvider>
  )

  return render(component, { wrapper: Wrapper, ...renderOptions })
}

describe('BarberProfileCustomization', () => {
  const mockOnUnsavedChanges = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Form State Management', () => {
    test('should initialize with default values', () => {
      renderWithProviders(
        <BarberProfileCustomization onUnsavedChanges={mockOnUnsavedChanges} />
      )

      expect(screen.getByDisplayValue('')).toBeInTheDocument() // Full name input
      expect(screen.getByDisplayValue('0')).toBeInTheDocument() // Years experience
    })

    test('should update form values and trigger unsaved changes', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <BarberProfileCustomization onUnsavedChanges={mockOnUnsavedChanges} />
      )

      const nameInput = screen.getByLabelText('Full Name')
      await user.type(nameInput, 'John Doe')

      expect(nameInput).toHaveValue('John Doe')
      
      // Wait for debounced unsaved changes notification
      await waitFor(() => {
        expect(mockOnUnsavedChanges).toHaveBeenCalledWith(true)
      }, { timeout: 6000 })
    })

    test('should auto-save after delay', async () => {
      jest.useFakeTimers()
      const mockSave = jest.fn().mockResolvedValue({})
      
      renderWithProviders(
        <BarberProfileCustomization onUnsavedChanges={mockOnUnsavedChanges} />
      )

      const nameInput = screen.getByLabelText('Full Name')
      fireEvent.change(nameInput, { target: { value: 'John Doe' } })

      // Fast-forward time to trigger auto-save
      jest.advanceTimersByTime(5000)
      
      await waitFor(() => {
        expect(screen.getByText('Auto-saving changes...')).toBeInTheDocument()
      })

      jest.useRealTimers()
    })
  })

  describe('Tab Navigation', () => {
    test('should switch between tabs', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <BarberProfileCustomization onUnsavedChanges={mockOnUnsavedChanges} />
      )

      const photosTab = screen.getByRole('button', { name: /photos/i })
      await user.click(photosTab)

      expect(screen.getByText('Profile Photo')).toBeInTheDocument()
      expect(screen.getByText('Portfolio Gallery')).toBeInTheDocument()
    })

    test('should maintain form state when switching tabs', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <BarberProfileCustomization onUnsavedChanges={mockOnUnsavedChanges} />
      )

      // Enter data in profile tab
      const nameInput = screen.getByLabelText('Full Name')
      await user.type(nameInput, 'John Doe')

      // Switch to services tab
      const servicesTab = screen.getByRole('button', { name: /services/i })
      await user.click(servicesTab)

      // Switch back to profile tab
      const profileTab = screen.getByRole('button', { name: /profile/i })
      await user.click(profileTab)

      // Verify data is preserved
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    test('should validate required fields', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <BarberProfileCustomization onUnsavedChanges={mockOnUnsavedChanges} />
      )

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument()
      })
    })

    test('should validate Six Figure Barber methodology compliance', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <BarberProfileCustomization onUnsavedChanges={mockOnUnsavedChanges} />
      )

      // Navigate to services tab
      const servicesTab = screen.getByRole('button', { name: /services/i })
      await user.click(servicesTab)

      // Try to select discount pricing (should be prevented)
      const pricingSelect = screen.getByLabelText('Pricing Display')
      await user.selectOptions(pricingSelect, 'discount')

      expect(screen.getByText(/conflicts with Six Figure methodology/)).toBeInTheDocument()
    })
  })

  describe('Image Upload', () => {
    test('should handle profile image upload', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <BarberProfileCustomization onUnsavedChanges={mockOnUnsavedChanges} />
      )

      // Navigate to photos tab
      const photosTab = screen.getByRole('button', { name: /photos/i })
      await user.click(photosTab)

      const file = new File(['profile image'], 'profile.jpg', { type: 'image/jpeg' })
      const uploadInput = screen.getByLabelText('Upload Profile Photo')
      
      await user.upload(uploadInput, file)

      await waitFor(() => {
        expect(screen.getByText('Upload successful')).toBeInTheDocument()
      })
    })

    test('should validate file size and type', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <BarberProfileCustomization onUnsavedChanges={mockOnUnsavedChanges} />
      )

      const photosTab = screen.getByRole('button', { name: /photos/i })
      await user.click(photosTab)

      // Upload invalid file type
      const invalidFile = new File(['invalid'], 'test.txt', { type: 'text/plain' })
      const uploadInput = screen.getByLabelText('Upload Profile Photo')
      
      await user.upload(uploadInput, invalidFile)

      await waitFor(() => {
        expect(screen.getByText('File type text/plain not supported')).toBeInTheDocument()
      })
    })
  })
})
```

#### Hook Testing

```javascript
// __tests__/hooks/useCustomizationForm.test.js
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCustomizationForm } from '@/hooks/useCustomizationForm'

describe('useCustomizationForm', () => {
  const initialSettings = {
    full_name: '',
    bio: '',
    years_experience: 0
  }

  test('should initialize with provided settings', () => {
    const { result } = renderHook(() => 
      useCustomizationForm(initialSettings)
    )

    expect(result.current.settings).toEqual(initialSettings)
    expect(result.current.hasUnsavedChanges).toBe(false)
  })

  test('should update settings and mark as unsaved', () => {
    const { result } = renderHook(() => 
      useCustomizationForm(initialSettings)
    )

    act(() => {
      result.current.updateSetting('full_name', 'John Doe')
    })

    expect(result.current.settings.full_name).toBe('John Doe')
    expect(result.current.hasUnsavedChanges).toBe(true)
  })

  test('should handle nested property updates', () => {
    const settings = {
      social_links: {
        instagram: '',
        website: ''
      }
    }

    const { result } = renderHook(() => 
      useCustomizationForm(settings)
    )

    act(() => {
      result.current.updateSetting('social_links.instagram', '@johndoe')
    })

    expect(result.current.settings.social_links.instagram).toBe('@johndoe')
    expect(result.current.settings.social_links.website).toBe('')
  })

  test('should implement undo/redo functionality', () => {
    const { result } = renderHook(() => 
      useCustomizationForm(initialSettings, { enableUndo: true })
    )

    // Make some changes
    act(() => {
      result.current.updateSetting('full_name', 'John Doe')
    })

    act(() => {
      result.current.updateSetting('bio', 'Master barber')
    })

    expect(result.current.canUndo).toBe(true)
    expect(result.current.settings.full_name).toBe('John Doe')
    expect(result.current.settings.bio).toBe('Master barber')

    // Undo last change
    act(() => {
      result.current.undo()
    })

    expect(result.current.settings.bio).toBe('')
    expect(result.current.settings.full_name).toBe('John Doe')
    expect(result.current.canRedo).toBe(true)

    // Redo
    act(() => {
      result.current.redo()
    })

    expect(result.current.settings.bio).toBe('Master barber')
  })

  test('should auto-save after delay', async () => {
    jest.useFakeTimers()
    const mockOnSave = jest.fn()

    const { result } = renderHook(() => 
      useCustomizationForm(initialSettings, {
        autoSaveDelay: 2000,
        onSave: mockOnSave
      })
    )

    act(() => {
      result.current.updateSetting('full_name', 'John Doe')
    })

    expect(result.current.isAutoSaving).toBe(false)

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({ full_name: 'John Doe' })
      )
    })

    jest.useRealTimers()
  })
})
```

### Integration Testing

```javascript
// __tests__/integration/customize-page-integration.test.js
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { server } from '@/mocks/server'
import CustomizePage from '@/app/(protected)/customize/page'

describe('Customize Page Integration', () => {
  test('should save profile changes end-to-end', async () => {
    // Mock API response
    server.use(
      rest.put('/api/customization/profile/settings', (req, res, ctx) => {
        return res(ctx.json({ 
          success: true,
          settings: req.body 
        }))
      })
    )

    const user = userEvent.setup()
    render(<CustomizePage />)

    // Fill out profile information
    const nameInput = screen.getByLabelText('Full Name')
    await user.type(nameInput, 'John Doe')

    const bioTextarea = screen.getByLabelText('Professional Bio')
    await user.type(bioTextarea, 'Experienced barber specializing in modern cuts')

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText('Profile settings saved successfully!')).toBeInTheDocument()
    })
  })

  test('should handle API errors gracefully', async () => {
    // Mock API error
    server.use(
      rest.put('/api/customization/profile/settings', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ 
          error: 'Internal server error' 
        }))
      })
    )

    const user = userEvent.setup()
    render(<CustomizePage />)

    const nameInput = screen.getByLabelText('Full Name')
    await user.type(nameInput, 'John Doe')

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to save settings. Please try again.')).toBeInTheDocument()
    })
  })
})
```

### Performance Testing

```javascript
// __tests__/performance/customize-performance.test.js
import { render } from '@testing-library/react'
import { Profiler } from 'react'
import CustomizePage from '@/app/(protected)/customize/page'

describe('Customize Page Performance', () => {
  test('should render within performance budget', () => {
    let renderTime = 0

    const onRender = (id, phase, actualDuration) => {
      renderTime = actualDuration
    }

    render(
      <Profiler id="CustomizePage" onRender={onRender}>
        <CustomizePage />
      </Profiler>
    )

    // Should render in under 16ms for 60fps
    expect(renderTime).toBeLessThan(16)
  })

  test('should handle large template lists efficiently', () => {
    const largeTemplateList = Array.from({ length: 1000 }, (_, i) => ({
      id: `template-${i}`,
      name: `Template ${i}`,
      preview_url: `https://example.com/preview-${i}.jpg`
    }))

    const startTime = performance.now()
    
    render(<TemplateGallery templates={largeTemplateList} />)
    
    const renderTime = performance.now() - startTime
    
    // Should render 1000 templates in under 100ms (virtualized)
    expect(renderTime).toBeLessThan(100)
  })
})
```

### Accessibility Testing

```javascript
// __tests__/accessibility/customize-a11y.test.js
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import CustomizePage from '@/app/(protected)/customize/page'

expect.extend(toHaveNoViolations)

describe('Customize Page Accessibility', () => {
  test('should not have accessibility violations', async () => {
    const { container } = render(<CustomizePage />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<CustomizePage />)

    // Tab through all interactive elements
    await user.tab()
    expect(document.activeElement).toHaveRole('button') // First tab button

    await user.tab()
    expect(document.activeElement).toHaveRole('button') // Second tab button

    // Test keyboard activation
    await user.keyboard('{Enter}')
    expect(screen.getByRole('tabpanel')).toBeVisible()
  })

  test('should have proper ARIA labels and descriptions', () => {
    render(<CustomizePage />)

    const nameInput = screen.getByLabelText('Full Name')
    expect(nameInput).toHaveAttribute('aria-describedby')

    const fileInput = screen.getByLabelText('Upload Profile Photo')
    expect(fileInput).toHaveAttribute('accept', 'image/*')
  })
})
```

---

## 8. Security Implementation

### Authentication Patterns

The customize page implements comprehensive security measures aligned with enterprise requirements:

#### JWT Token Management
```javascript
// Token validation with refresh logic
export async function validateAndRefreshToken() {
  const token = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  
  try {
    // Validate current token
    const { data: user } = await supabase.auth.getUser(token);
    if (user) return { success: true, user };
    
    // Attempt refresh if validation fails
    const { data: refreshData, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });
    
    if (error) throw error;
    
    // Update stored tokens
    localStorage.setItem('access_token', refreshData.session.access_token);
    localStorage.setItem('refresh_token', refreshData.session.refresh_token);
    
    return { success: true, user: refreshData.user };
  } catch (error) {
    // Clear invalid tokens and redirect to login
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    return { success: false, error };
  }
}
```

#### Role-Based Access Control (RBAC)
```javascript
// Role validation middleware
export function validateRole(requiredRole, userRole) {
  const roleHierarchy = {
    'SUPER_ADMIN': 4,
    'SHOP_OWNER': 3,
    'MANAGER': 2,
    'BARBER': 1,
    'CLIENT': 0
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Component-level role protection
export function ProtectedCustomizationSection({ requiredRole, children, user }) {
  if (!validateRole(requiredRole, user?.role)) {
    return <UnauthorizedMessage requiredRole={requiredRole} />;
  }
  
  return <>{children}</>;
}
```

#### Row Level Security (RLS) Integration
```sql
-- RLS policy for customization data
CREATE POLICY "customization_access_policy" 
ON customization_profiles 
FOR ALL 
USING (
  -- Shop owners can access their shop's data
  (auth.uid() = shop_owner_id) OR
  
  -- Barbers can access their own profile data
  (auth.uid() = barber_id AND section_type = 'barber_profile') OR
  
  -- Managers can access shop-level customization
  (auth.uid() IN (
    SELECT user_id FROM shop_staff 
    WHERE shop_id = customization_profiles.shop_id 
    AND role = 'MANAGER'
  ))
);
```

### Data Protection

#### Input Sanitization and Validation
```javascript
// Comprehensive input validation
import { z } from 'zod';
import DOMPurify from 'dompurify';

const CustomizationSchema = z.object({
  businessName: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s&'-]+$/, 'Invalid characters in business name'),
  
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .transform(value => DOMPurify.sanitize(value)),
  
  primaryColor: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  
  logoUrl: z.string()
    .url('Invalid logo URL')
    .refine(url => {
      const allowedDomains = ['cdn.6fb.com', 'uploads.bookedbarber.com'];
      return allowedDomains.some(domain => url.includes(domain));
    }, 'Logo must be hosted on approved domains')
});

// Safe data processing
export function sanitizeCustomizationData(formData) {
  try {
    const validated = CustomizationSchema.parse(formData);
    
    // Additional sanitization
    return {
      ...validated,
      businessName: validated.businessName.trim(),
      description: validated.description.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
      socialLinks: Object.fromEntries(
        Object.entries(validated.socialLinks || {})
          .filter(([key, value]) => isValidSocialUrl(value))
      )
    };
  } catch (error) {
    throw new ValidationError('Invalid customization data', error.errors);
  }
}
```

#### Secure File Upload Handling
```javascript
// Secure image upload with validation
export async function uploadCustomizationImage(file, category = 'general') {
  // File type validation
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
  }
  
  // File size validation (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size too large. Maximum 5MB allowed.');
  }
  
  // Image dimension validation
  const dimensions = await getImageDimensions(file);
  if (dimensions.width > 4000 || dimensions.height > 4000) {
    throw new Error('Image dimensions too large. Maximum 4000x4000 pixels.');
  }
  
  // Generate secure filename
  const fileExtension = file.name.split('.').pop().toLowerCase();
  const secureFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
  
  // Upload with metadata
  const { data, error } = await supabase.storage
    .from('customization-assets')
    .upload(`${category}/${secureFilename}`, file, {
      cacheControl: '3600',
      upsert: false,
      metadata: {
        uploaded_by: user.id,
        original_name: file.name,
        category: category
      }
    });
  
  if (error) throw error;
  
  // Return CDN URL
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/customization-assets/${data.path}`;
}
```

### Compliance Framework

#### GDPR Data Handling
```javascript
// GDPR-compliant data processing
export class GDPRCompliantCustomization {
  constructor(userId) {
    this.userId = userId;
    this.dataProcessingLog = [];
  }
  
  async processCustomizationData(data, legalBasis = 'legitimate_interest') {
    // Log data processing activity
    this.logDataProcessing({
      timestamp: new Date().toISOString(),
      dataTypes: Object.keys(data),
      legalBasis: legalBasis,
      purpose: 'business_customization',
      retention: '7_years'
    });
    
    // Apply data minimization principle
    const minimizedData = this.minimizeData(data);
    
    // Pseudonymize sensitive data
    const pseudonymizedData = this.pseudonymizeData(minimizedData);
    
    return await this.saveWithConsent(pseudonymizedData);
  }
  
  async handleDataSubjectRights(request) {
    switch (request.type) {
      case 'access':
        return await this.exportUserData();
      case 'rectification':
        return await this.updateUserData(request.corrections);
      case 'erasure':
        return await this.deleteUserData(request.reason);
      case 'portability':
        return await this.exportDataPortable();
      default:
        throw new Error('Invalid data subject request type');
    }
  }
}
```

#### Audit Trail Implementation
```javascript
// Comprehensive audit logging
export class CustomizationAuditLogger {
  static async logAction(action, details) {
    const auditEntry = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      user_id: getCurrentUser()?.id,
      action: action,
      resource: 'customization',
      details: JSON.stringify(details),
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
      session_id: getSessionId()
    };
    
    try {
      await supabase
        .from('audit_logs')
        .insert(auditEntry);
    } catch (error) {
      // Fallback to local logging if database unavailable
      console.error('Audit logging failed:', error);
      this.logToLocalStorage(auditEntry);
    }
  }
  
  static async generateComplianceReport(startDate, endDate) {
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .eq('resource', 'customization')
      .order('timestamp', { ascending: false });
    
    return {
      period: { startDate, endDate },
      totalActions: auditLogs.length,
      userActions: this.aggregateByUser(auditLogs),
      actionTypes: this.aggregateByAction(auditLogs),
      securityEvents: this.filterSecurityEvents(auditLogs),
      complianceStatus: this.assessCompliance(auditLogs)
    };
  }
}
```

---

## 9. Database Design

### Schema Architecture

The customize page relies on a comprehensive database schema designed for scalability and security:

#### Core Customization Tables
```sql
-- Main barbershops table with customization extensions
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '{
  "primary": "#3B82F6", 
  "secondary": "#1E40AF", 
  "accent": "#10B981", 
  "text": "#1F2937", 
  "background": "#FFFFFF"
}';
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS custom_css TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS theme_preset VARCHAR(50) DEFAULT 'default';
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS shop_slug VARCHAR(100) UNIQUE;

-- Website sections for flexible content management
CREATE TABLE website_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL, -- 'hero', 'services', 'about', 'testimonials', 'gallery'
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team member profiles
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  bio TEXT,
  specialties TEXT[],
  profile_image_url TEXT,
  years_experience INTEGER,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Performance Optimization Indexes
```sql
-- Strategic indexes for customization queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_website_sections_barbershop_type 
  ON website_sections(barbershop_id, section_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_barbershop_active 
  ON team_members(barbershop_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_barbershops_slug_lookup 
  ON barbershops(shop_slug) WHERE shop_slug IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customization_audit_user_time 
  ON audit_logs(user_id, timestamp) WHERE resource = 'customization';
```

### Data Access Patterns

#### Optimized Query Strategies
```javascript
// Efficient data fetching with minimal queries
export async function fetchCustomizationData(shopId, userId) {
  // Single query to get all customization data
  const { data, error } = await supabase
    .from('barbershops')
    .select(`
      *,
      website_sections (
        id,
        section_type,
        title,
        content,
        is_enabled,
        display_order
      ),
      team_members (
        id,
        name,
        title,
        bio,
        profile_image_url,
        is_active
      ),
      barbershop_gallery (
        id,
        image_url,
        caption,
        category,
        is_featured
      )
    `)
    .eq('id', shopId)
    .single();
  
  if (error) throw error;
  
  // Transform nested data for UI consumption
  return {
    shop: data,
    sections: data.website_sections.sort((a, b) => a.display_order - b.display_order),
    team: data.team_members.filter(member => member.is_active),
    gallery: data.barbershop_gallery.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
  };
}
```

#### Batch Update Operations
```javascript
// Atomic batch updates for consistency
export async function batchUpdateCustomization(updates) {
  const { error } = await supabase.rpc('update_customization_batch', {
    updates: JSON.stringify(updates)
  });
  
  if (error) throw error;
  
  // Invalidate relevant caches
  await invalidateCustomizationCache(updates.shop_id);
}
```

### Caching Strategy

#### Multi-Layer Caching
```javascript
// Redis-based caching with TTL management
export class CustomizationCache {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.localCache = new Map();
  }
  
  async get(key) {
    // Check local cache first (fastest)
    if (this.localCache.has(key)) {
      return this.localCache.get(key);
    }
    
    // Check Redis cache
    const cached = await this.redis.get(key);
    if (cached) {
      const data = JSON.parse(cached);
      this.localCache.set(key, data);
      return data;
    }
    
    return null;
  }
  
  async set(key, value, ttl = 3600) {
    // Set in both caches
    this.localCache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async invalidate(pattern) {
    // Clear local cache
    for (const key of this.localCache.keys()) {
      if (key.includes(pattern)) {
        this.localCache.delete(key);
      }
    }
    
    // Clear Redis cache
    const keys = await this.redis.keys(`*${pattern}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

---

## 10. API Architecture

### RESTful Design Principles

The customize page APIs follow REST conventions with enhanced features:

#### Resource-Based URL Structure
```javascript
// API endpoint organization
const API_ENDPOINTS = {
  // Shop-level customization
  shops: '/api/v1/customization/shops/:shopId',
  templates: '/api/v1/customization/templates',
  themes: '/api/v1/customization/themes',
  
  // Individual barber profiles
  barbers: '/api/v1/customization/barbers/:barberId',
  barberGallery: '/api/v1/customization/barbers/:barberId/gallery',
  
  // Bulk operations for enterprise features
  bulk: {
    export: '/api/v1/customization/bulk/export',
    import: '/api/v1/customization/bulk/import',
    apply: '/api/v1/customization/bulk/apply-template'
  },
  
  // Analytics and reporting
  analytics: '/api/v1/customization/analytics/:shopId',
  reports: '/api/v1/customization/reports'
};
```

#### HTTP Method Conventions
```javascript
// Proper HTTP method usage
export const customizationAPI = {
  // GET - Retrieve resources
  getShopCustomization: (shopId) => 
    fetch(`/api/v1/customization/shops/${shopId}`, { method: 'GET' }),
  
  // POST - Create new resources
  createCustomization: (data) =>
    fetch('/api/v1/customization/shops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  
  // PUT - Update entire resource
  updateCustomization: (shopId, data) =>
    fetch(`/api/v1/customization/shops/${shopId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  
  // PATCH - Partial updates
  patchCustomization: (shopId, changes) =>
    fetch(`/api/v1/customization/shops/${shopId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes)
    }),
  
  // DELETE - Remove resources
  deleteCustomization: (shopId) =>
    fetch(`/api/v1/customization/shops/${shopId}`, { method: 'DELETE' })
};
```

### WebSocket Implementation

#### Real-time Updates
```javascript
// WebSocket connection for live updates
export class CustomizationWebSocket {
  constructor(shopId, userId) {
    this.shopId = shopId;
    this.userId = userId;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }
  
  connect() {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/customization/${this.shopId}`;
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('Customization WebSocket connected');
      this.reconnectAttempts = 0;
      this.authenticate();
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.ws.onclose = () => {
      console.log('Customization WebSocket closed');
      this.reconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  authenticate() {
    this.send({
      type: 'auth',
      token: localStorage.getItem('access_token'),
      userId: this.userId,
      shopId: this.shopId
    });
  }
  
  handleMessage(data) {
    switch (data.type) {
      case 'customization_update':
        window.dispatchEvent(new CustomEvent('customizationUpdate', {
          detail: data.payload
        }));
        break;
      case 'template_applied':
        window.dispatchEvent(new CustomEvent('templateApplied', {
          detail: data.payload
        }));
        break;
      case 'bulk_operation_complete':
        window.dispatchEvent(new CustomEvent('bulkOperationComplete', {
          detail: data.payload
        }));
        break;
    }
  }
  
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(), delay);
    }
  }
}
```

### Error Handling Strategy

#### Comprehensive Error Management
```javascript
// Standardized API error handling
export class APIError extends Error {
  constructor(message, status, code, details = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
  
  static fromResponse(response, details = {}) {
    return new APIError(
      response.message || 'An API error occurred',
      response.status || 500,
      response.code || 'UNKNOWN_ERROR',
      { ...response.details, ...details }
    );
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

// Error boundary for API calls
export async function apiCall(requestFn, options = {}) {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    onRetry = () => {},
    onError = () => {}
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Set timeout for request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await requestFn({ signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw APIError.fromResponse(await response.json());
      }
      
      return await response.json();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        break;
      }
      
      // Don't retry on last attempt
      if (attempt === retries) {
        break;
      }
      
      onRetry(error, attempt + 1);
      
      // Exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  onError(lastError);
  throw lastError;
}
```

---

## 11. Development Workflow

### Git Workflow

#### Branch Strategy
```bash
# Feature development workflow
git checkout main
git pull origin main
git checkout -b feature/customize-enhancement-YYYYMMDD

# Development with regular commits
git add -A
git commit -m "feat: add template preview functionality"
git commit -m "test: add unit tests for template service"
git commit -m "docs: update API documentation"

# Pre-push validation
npm run test
npm run build
npm run lint

# Push and create PR
git push origin feature/customize-enhancement-YYYYMMDD
gh pr create --title "Enhancement: Advanced Template System" --body "Detailed PR description"
```

#### Commit Message Standards
```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes (no code changes)
refactor: code refactor
test: adding or updating tests
chore: maintenance tasks

Examples:
feat(customize): add real-time preview for color changes
fix(api): resolve template loading race condition
docs(customize): update component usage examples
test(hooks): add tests for useCustomizationForm
```

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
# .github/workflows/customize-page.yml
name: Customize Page CI/CD

on:
  push:
    branches: [main, staging]
    paths: 
      - 'app/(protected)/customize/**'
      - 'components/customization/**'
      - 'hooks/useCustomization*'
  pull_request:
    branches: [main]
    paths:
      - 'app/(protected)/customize/**'
      - 'components/customization/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:customize
      - run: npm run test:accessibility
      - run: npm run test:performance
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: customize-page

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level high
      - run: npm run security:scan

  build:
    runs-on: ubuntu-latest
    needs: [test, security]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      - run: npm run bundle-analyzer

  deploy:
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          echo "Deploying customize page to production"
          # Deployment steps here
```

### Code Review Process

#### Review Checklist
```markdown
## Code Review Checklist - Customize Page

### Functionality
- [ ] Feature works as intended across all user roles
- [ ] Error handling covers edge cases
- [ ] Performance impact is minimal
- [ ] Accessibility requirements met

### Code Quality
- [ ] Code follows established patterns
- [ ] No console.log statements in production code
- [ ] Proper TypeScript types used
- [ ] Dependencies updated appropriately

### Testing
- [ ] Unit tests cover new functionality
- [ ] Integration tests updated
- [ ] Performance tests pass
- [ ] Accessibility tests pass

### Security
- [ ] Input validation implemented
- [ ] No sensitive data exposed
- [ ] Authentication/authorization correct
- [ ] XSS prevention measures in place

### Documentation
- [ ] README updated if needed
- [ ] API documentation current
- [ ] Component documentation complete
- [ ] Migration guide provided if breaking changes
```

#### Automated Review Tools
```json
{
  "scripts": {
    "review:prepare": "npm run lint && npm run test && npm run build",
    "review:security": "npm audit && npm run security:scan",
    "review:performance": "npm run perf:test && npm run bundle:analyze",
    "review:accessibility": "npm run a11y:test",
    "review:all": "npm run review:prepare && npm run review:security && npm run review:performance && npm run review:accessibility"
  }
}
```

---

## 12. Advanced Patterns

### State Management

#### Context + Reducer Pattern
```javascript
// CustomizationContext.js - Centralized state management
import { createContext, useContext, useReducer, useEffect } from 'react';

const CustomizationContext = createContext();

const initialState = {
  currentStep: 'basic-info',
  formData: {},
  isDirty: false,
  isSaving: false,
  errors: {},
  history: [],
  maxHistoryLength: 50
};

function customizationReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.field]: action.value
        },
        isDirty: true,
        history: [
          ...state.history.slice(-state.maxHistoryLength + 1),
          {
            type: 'field_update',
            field: action.field,
            oldValue: state.formData[action.field],
            newValue: action.value,
            timestamp: Date.now()
          }
        ]
      };
    
    case 'SAVE_START':
      return { ...state, isSaving: true, errors: {} };
    
    case 'SAVE_SUCCESS':
      return { 
        ...state, 
        isSaving: false, 
        isDirty: false,
        history: [
          ...state.history,
          { type: 'save_success', timestamp: Date.now() }
        ]
      };
    
    case 'SAVE_ERROR':
      return { 
        ...state, 
        isSaving: false, 
        errors: action.errors,
        history: [
          ...state.history,
          { type: 'save_error', errors: action.errors, timestamp: Date.now() }
        ]
      };
    
    case 'UNDO':
      const lastUpdate = [...state.history]
        .reverse()
        .find(item => item.type === 'field_update');
      
      if (lastUpdate) {
        return {
          ...state,
          formData: {
            ...state.formData,
            [lastUpdate.field]: lastUpdate.oldValue
          },
          history: [
            ...state.history,
            { type: 'undo', field: lastUpdate.field, timestamp: Date.now() }
          ]
        };
      }
      return state;
    
    default:
      return state;
  }
}

export function CustomizationProvider({ children }) {
  const [state, dispatch] = useReducer(customizationReducer, initialState);
  
  // Auto-save effect
  useEffect(() => {
    if (state.isDirty && !state.isSaving) {
      const saveTimer = setTimeout(() => {
        handleAutoSave();
      }, 5000);
      
      return () => clearTimeout(saveTimer);
    }
  }, [state.formData, state.isDirty]);
  
  async function handleAutoSave() {
    dispatch({ type: 'SAVE_START' });
    
    try {
      await saveCustomizationData(state.formData);
      dispatch({ type: 'SAVE_SUCCESS' });
    } catch (error) {
      dispatch({ type: 'SAVE_ERROR', errors: error.details });
    }
  }
  
  const value = {
    state,
    dispatch,
    updateField: (field, value) => dispatch({ type: 'UPDATE_FIELD', field, value }),
    save: handleAutoSave,
    undo: () => dispatch({ type: 'UNDO' })
  };
  
  return (
    <CustomizationContext.Provider value={value}>
      {children}
    </CustomizationContext.Provider>
  );
}

export function useCustomization() {
  const context = useContext(CustomizationContext);
  if (!context) {
    throw new Error('useCustomization must be used within CustomizationProvider');
  }
  return context;
}
```

### Error Handling

#### Global Error Boundary with Recovery
```javascript
// ErrorBoundary.js - Production-ready error handling
import React from 'react';
import { logErrorToSentry } from '@/lib/monitoring';

export class CustomizationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      maxRetries: 3
    };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    
    // Log to monitoring service
    logErrorToSentry(error, {
      component: 'CustomizationPage',
      errorInfo: errorInfo,
      userId: this.props.userId,
      retryCount: this.state.retryCount
    });
    
    // Track error in analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: true,
        custom_map: {
          component: 'customization_page',
          retry_count: this.state.retryCount
        }
      });
    }
  }
  
  handleRetry = () => {
    if (this.state.retryCount < this.state.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1
      });
    }
  };
  
  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < this.state.maxRetries;
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <div className="mt-4 text-center">
              <h3 className="text-lg font-medium text-gray-900">
                Something went wrong with the customization page
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                We've been notified about this error and are working to fix it.
              </p>
            </div>
            
            <div className="mt-6 flex gap-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700"
                >
                  Try Again ({this.state.maxRetries - this.state.retryCount} left)
                </button>
              )}
              
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="flex-1 bg-gray-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-700"
              >
                Go to Dashboard
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Technical Details
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### Monitoring Integration

#### Performance and Usage Analytics
```javascript
// monitoring.js - Comprehensive monitoring setup
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

class CustomizationMonitoring {
  constructor() {
    this.metrics = {};
    this.customEvents = [];
    this.setupWebVitals();
    this.setupCustomTracking();
  }
  
  setupWebVitals() {
    getCLS(this.handleMetric.bind(this));
    getFID(this.handleMetric.bind(this));
    getFCP(this.handleMetric.bind(this));
    getLCP(this.handleMetric.bind(this));
    getTTFB(this.handleMetric.bind(this));
  }
  
  handleMetric(metric) {
    this.metrics[metric.name] = metric.value;
    
    // Send to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'web_vitals', {
        event_category: 'Performance',
        event_label: metric.name,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        custom_map: {
          page: 'customization',
          metric_id: metric.id
        }
      });
    }
  }
  
  setupCustomTracking() {
    // Track customization feature usage
    this.trackFeatureUsage = (feature, action, value = 1) => {
      this.customEvents.push({
        timestamp: Date.now(),
        feature,
        action,
        value
      });
      
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'customization_feature', {
          event_category: 'Customization',
          event_label: `${feature}_${action}`,
          value: value,
          custom_map: {
            feature: feature,
            action: action
          }
        });
      }
    };
    
    // Track form interactions
    this.trackFormInteraction = (field, interactionType) => {
      this.trackFeatureUsage('form', `${field}_${interactionType}`);
    };
    
    // Track template usage
    this.trackTemplateUsage = (templateId, action) => {
      this.trackFeatureUsage('template', action, templateId);
    };
    
    // Track color picker usage
    this.trackColorChange = (colorType, oldValue, newValue) => {
      this.trackFeatureUsage('color_picker', `${colorType}_change`);
    };
  }
  
  // Generate usage report
  generateUsageReport() {
    const report = {
      pageMetrics: this.metrics,
      customEvents: this.customEvents,
      sessionDuration: Date.now() - (window.sessionStart || Date.now()),
      timestamp: new Date().toISOString()
    };
    
    return report;
  }
  
  // Send report to backend
  async sendReport() {
    const report = this.generateUsageReport();
    
    try {
      await fetch('/api/v1/analytics/customization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(report)
      });
    } catch (error) {
      console.error('Failed to send analytics report:', error);
    }
  }
}

// Initialize monitoring
export const customizationMonitoring = new CustomizationMonitoring();

// Hook for component-level monitoring
export function useCustomizationMonitoring() {
  return {
    trackFeature: customizationMonitoring.trackFeatureUsage,
    trackForm: customizationMonitoring.trackFormInteraction,
    trackTemplate: customizationMonitoring.trackTemplateUsage,
    trackColor: customizationMonitoring.trackColorChange
  };
}
```

---

## Conclusion

This Developer Architecture Guide provides comprehensive technical documentation for the 6FB AI Agent System customize page, covering all aspects from component architecture to production deployment. The guide serves as both a reference for current developers and onboarding documentation for new team members.

### Key Takeaways

1. **Modular Architecture**: The system is built with composable components that follow React best practices
2. **Performance-First**: Every pattern prioritizes performance and scalability
3. **Security-Focused**: Comprehensive security measures protect user data and system integrity
4. **Six Figure Barber Alignment**: All technical decisions support business methodology goals
5. **Production-Ready**: Patterns and practices are designed for enterprise-scale deployment

### Next Steps

- Implement monitoring dashboards based on the analytics framework
- Enhance the A/B testing system with more sophisticated statistical analysis
- Expand the template system with AI-powered customization suggestions
- Develop advanced enterprise features for multi-location management

This guide should be updated regularly as the system evolves and new patterns emerge from production usage.

---

*Last Updated: 2025-01-24*  
*Document Version: 1.0*  
*Next Review: 2025-02-24*