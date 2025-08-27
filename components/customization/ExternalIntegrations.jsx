'use client'

import { 
  PaintBrushIcon,
  BuildingOffice2Icon,
  StarIcon,
  PhotoIcon,
  LinkIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  ShareIcon,
  EyeIcon,
  InformationCircleIcon,
  BeakerIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  CameraIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'

const IntegrationCard = ({ integration, onConnect, onDisconnect, onConfigure, isConnected, isConnecting }) => {
  const getStatusColor = () => {
    if (isConnecting) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (isConnected) return 'bg-green-100 text-green-800 border-green-200'
    return 'bg-gray-100 text-gray-600 border-gray-200'
  }

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...'
    if (isConnected) return 'Connected'
    return 'Not Connected'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r rounded-xl flex items-center justify-center" style={{
              background: `linear-gradient(135deg, ${integration.primaryColor}, ${integration.secondaryColor})`
            }}>
              <integration.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
              <p className="text-sm text-gray-600">{integration.description}</p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
            {getStatusText()}
          </div>
        </div>

        {/* Features */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
          <div className="grid grid-cols-1 gap-2">
            {integration.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Six Figure Barber Benefits */}
        {integration.sixFigureBenefits && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-900 mb-2 flex items-center space-x-1">
              <SparklesIcon className="w-4 h-4" />
              <span>Six Figure Barber Benefits</span>
            </h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              {integration.sixFigureBenefits.map((benefit, index) => (
                <li key={index}>• {benefit}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {!isConnected ? (
            <button
              onClick={() => onConnect(integration.id)}
              disabled={isConnecting}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  <span>Connect</span>
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={() => onConfigure(integration.id)}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                <span>Configure</span>
              </button>
              <button
                onClick={() => onDisconnect(integration.id)}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Connection Details */}
        {isConnected && integration.connectionDetails && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 space-y-1">
              {Object.entries(integration.connectionDetails).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace('_', ' ')}:</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const CanvaDesignStudio = ({ isConnected, settings, onUpdateSettings }) => {
  const [designs, setDesigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const mockDesigns = [
    {
      id: 'design_1',
      name: 'Classic Barbershop Logo',
      type: 'logo',
      thumbnail: '/api/placeholder/200/200',
      category: 'branding',
      dimensions: '500x500',
      format: 'PNG',
      tags: ['classic', 'barbershop', 'traditional']
    },
    {
      id: 'design_2', 
      name: 'Modern Salon Banner',
      type: 'banner',
      thumbnail: '/api/placeholder/400/200',
      category: 'marketing',
      dimensions: '1200x600',
      format: 'JPG',
      tags: ['modern', 'salon', 'promotional']
    },
    {
      id: 'design_3',
      name: 'Social Media Post Template',
      type: 'social',
      thumbnail: '/api/placeholder/300/300',
      category: 'social',
      dimensions: '1080x1080',
      format: 'PNG',
      tags: ['social', 'instagram', 'facebook']
    }
  ]

  useEffect(() => {
    if (isConnected) {
      setDesigns(mockDesigns)
    }
  }, [isConnected])

  const handleCreateDesign = async (templateType) => {
    setLoading(true)
    // Simulate Canva API call
    setTimeout(() => {
      setLoading(false)
      // Open Canva in new window with template
      window.open(`https://canva.com/design/new?template=${templateType}`, '_blank')
    }, 1000)
  }

  const handleImportDesign = async (designId) => {
    try {
      // Simulate importing design from Canva
      const design = designs.find(d => d.id === designId)
      if (design) {
        // Apply design to customization settings
        onUpdateSettings({
          brandAssets: {
            ...settings.brandAssets,
            [design.type]: {
              url: design.thumbnail,
              name: design.name,
              canvaId: designId
            }
          }
        })
      }
    } catch (error) {
      console.error('Error importing design:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8 text-gray-500">
        <PaintBrushIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>Connect to Canva to access design tools</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => handleCreateDesign('logo')}
          disabled={loading}
          className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          <PaintBrushIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <div className="text-sm font-medium text-gray-900">Create Logo</div>
          <div className="text-xs text-gray-500">Design a professional logo</div>
        </button>

        <button
          onClick={() => handleCreateDesign('banner')}
          disabled={loading}
          className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          <PhotoIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <div className="text-sm font-medium text-gray-900">Create Banner</div>
          <div className="text-xs text-gray-500">Marketing banners</div>
        </button>

        <button
          onClick={() => handleCreateDesign('social')}
          disabled={loading}
          className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          <ShareIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <div className="text-sm font-medium text-gray-900">Social Media</div>
          <div className="text-xs text-gray-500">Social media graphics</div>
        </button>
      </div>

      {/* Recent Designs */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Canva Designs</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map(design => (
            <div key={design.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                <img
                  src={design.thumbnail}
                  alt={design.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className="hidden w-full h-full items-center justify-center bg-gray-100">
                  <PhotoIcon className="w-12 h-12 text-gray-400" />
                </div>
              </div>
              <div className="p-4">
                <h5 className="font-medium text-gray-900 mb-1">{design.name}</h5>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span className="capitalize">{design.type}</span>
                  <span>{design.dimensions}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleImportDesign(design.id)}
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Import
                  </button>
                  <button className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const GoogleMyBusinessManager = ({ isConnected, settings, onUpdateSettings }) => {
  const [locations, setLocations] = useState([])
  const [reviews, setReviews] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)

  const mockLocations = [
    {
      id: 'loc_1',
      name: 'Downtown Barbershop',
      address: '123 Main St, New York, NY 10001',
      rating: 4.8,
      reviewCount: 127,
      status: 'verified',
      phone: '(555) 123-4567',
      website: 'https://downtownbarbershop.com'
    }
  ]

  const mockReviews = [
    {
      id: 'rev_1',
      author: 'John D.',
      rating: 5,
      text: 'Amazing haircut and great service! Will definitely be back.',
      date: '2024-01-15',
      responded: false,
      location: 'Downtown Barbershop'
    },
    {
      id: 'rev_2', 
      author: 'Mike S.',
      rating: 4,
      text: 'Good experience overall. Professional barbers.',
      date: '2024-01-12',
      responded: true,
      location: 'Downtown Barbershop'
    }
  ]

  useEffect(() => {
    if (isConnected) {
      setLocations(mockLocations)
      setReviews(mockReviews)
    }
  }, [isConnected])

  const handleRespondToReview = async (reviewId, response) => {
    try {
      // Simulate API call to Google My Business
      setLoading(true)
      setTimeout(() => {
        setReviews(prev => prev.map(review => 
          review.id === reviewId ? { ...review, responded: true, response } : review
        ))
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Error responding to review:', error)
      setLoading(false)
    }
  }

  const generateAIResponse = (review) => {
    // Six Figure Barber methodology-aligned responses
    const responses = {
      5: [
        `Thank you ${review.author} for the amazing review! We're thrilled that you experienced our commitment to excellence. We look forward to continuing to exceed your expectations!`,
        `${review.author}, your kind words mean the world to us! Our team takes great pride in delivering premium service that matches our Six Figure Barber standards.`
      ],
      4: [
        `Thank you for the feedback, ${review.author}! We appreciate your business and are always striving to elevate every aspect of your experience with us.`,
        `${review.author}, thank you for choosing us! We're glad you had a good experience and we're committed to making it even better next time.`
      ],
      3: [
        `Thank you for the review, ${review.author}. We value your feedback and would love to discuss how we can better serve you. Please reach out to us directly.`,
        `${review.author}, we appreciate you taking the time to share your experience. We're committed to continuous improvement and would welcome the opportunity to exceed your expectations.`
      ]
    }
    
    const ratingResponses = responses[review.rating] || responses[3]
    return ratingResponses[Math.floor(Math.random() * ratingResponses.length)]
  }

  const handleCreatePost = async (postData) => {
    try {
      setLoading(true)
      // Simulate creating a Google My Business post
      const newPost = {
        id: `post_${Date.now()}`,
        ...postData,
        status: 'published',
        date: new Date().toISOString()
      }
      setPosts(prev => [newPost, ...prev])
      setLoading(false)
    } catch (error) {
      console.error('Error creating post:', error)
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BuildingOffice2Icon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>Connect to Google My Business to manage your listing</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Business Locations */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Business Locations</h4>
        <div className="space-y-4">
          {locations.map(location => (
            <div key={location.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h5 className="text-lg font-semibold text-gray-900">{location.name}</h5>
                  <p className="text-gray-600">{location.address}</p>
                  <p className="text-sm text-gray-500">{location.phone}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1 mb-1">
                    <StarIcon className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold">{location.rating}</span>
                    <span className="text-gray-500">({location.reviewCount})</span>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    location.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {location.status}
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => handleCreatePost({ 
                    type: 'offer',
                    locationId: location.id,
                    title: 'Special Offer',
                    content: 'Book your premium haircut today!'
                  })}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Post
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                  View Insights
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                  Edit Info
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Reviews */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h4>
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h6 className="font-medium text-gray-900">{review.author}</h6>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'text-yellow-500' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{review.text}</p>
                  <p className="text-xs text-gray-500">{new Date(review.date).toLocaleDateString()}</p>
                </div>
                
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  review.responded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {review.responded ? 'Responded' : 'Needs Response'}
                </div>
              </div>
              
              {!review.responded && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h6 className="text-sm font-medium text-gray-900">Respond to Review</h6>
                    <button
                      onClick={() => {
                        const aiResponse = generateAIResponse(review)
                        document.getElementById(`response-${review.id}`).value = aiResponse
                      }}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                    >
                      <BeakerIcon className="w-4 h-4" />
                      <span>Generate AI Response</span>
                    </button>
                  </div>
                  
                  <textarea
                    id={`response-${review.id}`}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Write a professional response..."
                  />
                  
                  <div className="flex items-center justify-end space-x-2 mt-3">
                    <button className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const response = document.getElementById(`response-${review.id}`).value
                        if (response.trim()) {
                          handleRespondToReview(review.id, response)
                        }
                      }}
                      disabled={loading}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Respond
                    </button>
                  </div>
                </div>
              )}
              
              {review.responded && review.response && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm text-blue-800">
                    <strong>Your response:</strong> {review.response}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const IntegrationConfigModal = ({ integration, isOpen, onClose, onSave }) => {
  const [config, setConfig] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (integration && isOpen) {
      setConfig(integration.config || {})
    }
  }, [integration, isOpen])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(integration.id, config)
      onClose()
    } catch (error) {
      console.error('Error saving configuration:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !integration) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Configure {integration.name}</h2>
            <p className="text-sm text-gray-600 mt-1">Customize your integration settings</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
          {/* Configuration Options */}
          {integration.id === 'canva' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto-sync Designs
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.autoSync || false}
                    onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    Automatically sync designs from your Canva account
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Kit Sync
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.brandKitSync || false}
                    onChange={(e) => setConfig({ ...config, brandKitSync: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    Sync brand colors and fonts with your Canva Brand Kit
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Categories
                </label>
                <div className="space-y-2">
                  {['Logos', 'Social Media', 'Marketing Materials', 'Business Cards'].map(category => (
                    <div key={category} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.categories?.includes(category) || false}
                        onChange={(e) => {
                          const categories = config.categories || []
                          if (e.target.checked) {
                            setConfig({ ...config, categories: [...categories, category] })
                          } else {
                            setConfig({ ...config, categories: categories.filter(c => c !== category) })
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {integration.id === 'google_my_business' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto-respond to Reviews
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.autoRespond || false}
                    onChange={(e) => setConfig({ ...config, autoRespond: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    Automatically respond to reviews using AI
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Tone
                </label>
                <select
                  value={config.responseTone || 'professional'}
                  onChange={(e) => setConfig({ ...config, responseTone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="grateful">Grateful</option>
                  <option value="premium">Premium (Six Figure Barber)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notifications
                </label>
                <div className="space-y-2">
                  {['Email', 'SMS', 'In-App'].map(method => (
                    <div key={method} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.notifications?.includes(method) || false}
                        onChange={(e) => {
                          const notifications = config.notifications || []
                          if (e.target.checked) {
                            setConfig({ ...config, notifications: [...notifications, method] })
                          } else {
                            setConfig({ ...config, notifications: notifications.filter(n => n !== method) })
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{method}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Configuration</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ExternalIntegrations() {
  const { user } = useAuth()
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(new Set())
  const [selectedIntegration, setSelectedIntegration] = useState(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [activeTab, setActiveTab] = useState('canva')
  const [message, setMessage] = useState({ type: '', text: '' })

  const supabase = createClient()

  // Available integrations
  const availableIntegrations = [
    {
      id: 'canva',
      name: 'Canva',
      description: 'Professional design tools for logos, banners, and marketing materials',
      icon: PaintBrushIcon,
      primaryColor: '#00C4CC',
      secondaryColor: '#7B2D8E',
      features: [
        'Access to premium templates',
        'Brand kit synchronization',
        'Drag-and-drop design editor',
        'Export in multiple formats',
        'Collaborative design tools'
      ],
      sixFigureBenefits: [
        'Premium brand positioning through professional designs',
        'Consistent visual identity across all marketing materials',
        'Time-saving templates optimized for barbershops',
        'High-quality assets that command premium pricing'
      ],
      category: 'design',
      isConnected: false
    },
    {
      id: 'google_my_business',
      name: 'Google My Business',
      description: 'Manage your business listing, reviews, and local SEO presence',
      icon: BuildingOffice2Icon,
      primaryColor: '#4285F4',
      secondaryColor: '#34A853',
      features: [
        'Business listing management',
        'Review monitoring and responses',
        'Local SEO optimization',
        'Business insights and analytics',
        'Post creation and scheduling'
      ],
      sixFigureBenefits: [
        'Enhanced local visibility for premium service positioning',
        'Professional review management builds trust and authority',
        'Data-driven insights for optimizing client acquisition',
        'Direct booking integration increases conversion rates'
      ],
      category: 'marketing',
      isConnected: false
    },
    {
      id: 'instagram_business',
      name: 'Instagram Business',
      description: 'Connect your Instagram Business account for social media management',
      icon: CameraIcon,
      primaryColor: '#E4405F',
      secondaryColor: '#405DE6',
      features: [
        'Content scheduling and publishing',
        'Story management',
        'Direct message integration',
        'Analytics and insights',
        'Hashtag optimization'
      ],
      sixFigureBenefits: [
        'Showcase premium work to attract high-value clients',
        'Build personal brand and authority in barbering',
        'Direct client acquisition through social proof',
        'Consistent content strategy for business growth'
      ],
      category: 'social',
      isConnected: false
    },
    {
      id: 'facebook_business',
      name: 'Facebook Business',
      description: 'Manage your Facebook business page and advertising',
      icon: MegaphoneIcon,
      primaryColor: '#1877F2',
      secondaryColor: '#42B883',
      features: [
        'Page management',
        'Ad campaign creation',
        'Audience insights',
        'Event management',
        'Messenger integration'
      ],
      sixFigureBenefits: [
        'Targeted advertising for premium client acquisition',
        'Community building and client retention',
        'Event promotion for special services',
        'Messenger booking integration'
      ],
      category: 'social',
      isConnected: false
    }
  ]

  useEffect(() => {
    if (user) {
      loadIntegrations()
    }
  }, [user])

  const loadIntegrations = async () => {
    try {
      setLoading(true)
      
      // Get user's connected integrations
      const { data: connectedIntegrations, error } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      const integrationsWithStatus = availableIntegrations.map(integration => {
        const connected = connectedIntegrations?.find(ci => ci.integration_id === integration.id)
        return {
          ...integration,
          isConnected: !!connected,
          connectionDetails: connected?.connection_details,
          config: connected?.configuration
        }
      })

      setIntegrations(integrationsWithStatus)
    } catch (error) {
      console.error('Error loading integrations:', error)
      setIntegrations(availableIntegrations)
      setMessage({ type: 'error', text: 'Error loading integrations. Showing defaults.' })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (integrationId) => {
    try {
      setConnecting(prev => new Set(prev).add(integrationId))
      
      // Simulate OAuth flow
      const integration = integrations.find(i => i.id === integrationId)
      
      // For demo purposes, simulate successful connection
      setTimeout(async () => {
        // Save connection to database
        const { error } = await supabase
          .from('user_integrations')
          .upsert({
            user_id: user.id,
            integration_id: integrationId,
            connection_details: {
              connected_at: new Date().toISOString(),
              status: 'active'
            },
            configuration: {}
          })

        if (error) throw error

        // Update local state
        setIntegrations(prev => prev.map(i => 
          i.id === integrationId 
            ? { ...i, isConnected: true, connectionDetails: { connected_at: new Date().toISOString() } }
            : i
        ))

        setConnecting(prev => {
          const newSet = new Set(prev)
          newSet.delete(integrationId)
          return newSet
        })

        setMessage({ 
          type: 'success', 
          text: `Successfully connected to ${integration.name}!` 
        })
      }, 2000)
      
    } catch (error) {
      console.error('Error connecting integration:', error)
      setMessage({ type: 'error', text: `Error connecting to integration: ${error.message}` })
      setConnecting(prev => {
        const newSet = new Set(prev)
        newSet.delete(integrationId)
        return newSet
      })
    }
  }

  const handleDisconnect = async (integrationId) => {
    try {
      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('integration_id', integrationId)

      if (error) throw error

      setIntegrations(prev => prev.map(i => 
        i.id === integrationId 
          ? { ...i, isConnected: false, connectionDetails: null, config: {} }
          : i
      ))

      setMessage({ type: 'success', text: 'Integration disconnected successfully.' })
    } catch (error) {
      console.error('Error disconnecting integration:', error)
      setMessage({ type: 'error', text: 'Error disconnecting integration.' })
    }
  }

  const handleConfigure = (integrationId) => {
    const integration = integrations.find(i => i.id === integrationId)
    setSelectedIntegration(integration)
    setShowConfigModal(true)
  }

  const handleSaveConfig = async (integrationId, config) => {
    try {
      const { error } = await supabase
        .from('user_integrations')
        .update({ configuration: config })
        .eq('user_id', user.id)
        .eq('integration_id', integrationId)

      if (error) throw error

      setIntegrations(prev => prev.map(i => 
        i.id === integrationId ? { ...i, config } : i
      ))

      setMessage({ type: 'success', text: 'Configuration saved successfully.' })
    } catch (error) {
      console.error('Error saving configuration:', error)
      setMessage({ type: 'error', text: 'Error saving configuration.' })
      throw error
    }
  }

  const connectedIntegrations = integrations.filter(i => i.isConnected)
  const canvaIntegration = connectedIntegrations.find(i => i.id === 'canva')
  const gmbIntegration = connectedIntegrations.find(i => i.id === 'google_my_business')

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-32 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">External Integrations</h2>
          <p className="text-gray-600 mt-1">
            Connect powerful tools to enhance your barbershop's digital presence
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600">
            {connectedIntegrations.length} of {integrations.length} connected
          </div>
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${(connectedIntegrations.length / integrations.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="ml-4 text-current hover:opacity-70"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              isConnected={integration.isConnected}
              isConnecting={connecting.has(integration.id)}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onConfigure={handleConfigure}
            />
          ))}
        </div>
      </div>

      {/* Integration Management Tabs */}
      {connectedIntegrations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {connectedIntegrations.map(integration => (
                <button
                  key={integration.id}
                  onClick={() => setActiveTab(integration.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === integration.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <integration.icon className="w-4 h-4" />
                    <span>{integration.name}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'canva' && canvaIntegration && (
              <CanvaDesignStudio
                isConnected={canvaIntegration.isConnected}
                settings={canvaIntegration.config || {}}
                onUpdateSettings={(newSettings) => {
                  handleSaveConfig(canvaIntegration.id, newSettings)
                }}
              />
            )}

            {activeTab === 'google_my_business' && gmbIntegration && (
              <GoogleMyBusinessManager
                isConnected={gmbIntegration.isConnected}
                settings={gmbIntegration.config || {}}
                onUpdateSettings={(newSettings) => {
                  handleSaveConfig(gmbIntegration.id, newSettings)
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      <IntegrationConfigModal
        integration={selectedIntegration}
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleSaveConfig}
      />
    </div>
  )
}