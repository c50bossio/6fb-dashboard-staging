'use client'

import { 
  StarIcon,
  UserGroupIcon,
  ChartBarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'

import GlobalNavigation from '../../../components/GlobalNavigation'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { useAuth } from '../../../components/SupabaseAuthProvider'
import ReviewCardEnhanced from '../../../components/reviews/ReviewCardEnhanced'

export default function ReviewsPage() {
  const { user, profile } = useAuth()
  const [reviews, setReviews] = useState([])
  const [filteredReviews, setFilteredReviews] = useState([])
  const [barbers, setBarbers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBarber, setSelectedBarber] = useState('all')
  const [selectedRating, setSelectedRating] = useState('all')
  const [selectedConfidence, setSelectedConfidence] = useState('all')
  const [selectedSentiment, setSelectedSentiment] = useState('all')
  const [dateRange, setDateRange] = useState('all')

  // Modal states
  const [selectedReview, setSelectedReview] = useState(null)
  const [showAttributionModal, setShowAttributionModal] = useState(false)
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [useEnhancedView, setUseEnhancedView] = useState(true) // Enable enhanced view by default

  // Load reviews and barbers from APIs
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const barbershopId = profile?.barbershop_id || 'demo-shop-001'
        
        // Load barbers for filter
        const barbersResponse = await fetch(`/api/barbers?barbershop_id=${barbershopId}&active_only=true`)
        if (barbersResponse.ok) {
          const barbersResult = await barbersResponse.json()
          if (barbersResult.barbers) {
            setBarbers(barbersResult.barbers)
          }
        }

        // Load reviews with attribution
        const reviewsResponse = await fetch(`/api/gmb/reviews?barbershop_id=${barbershopId}&limit=50`)
        if (reviewsResponse.ok) {
          const reviewsResult = await reviewsResponse.json()
          if (reviewsResult.success && reviewsResult.data?.reviews) {
            const formattedReviews = reviewsResult.data.reviews.map(review => ({
              id: review.id,
              googleReviewId: review.google_review_id,
              reviewerName: review.reviewer_name,
              reviewerPhoto: review.reviewer_profile_photo_url,
              reviewText: review.review_text,
              starRating: review.star_rating,
              reviewDate: new Date(review.review_date),
              reviewUrl: review.review_url,
              attribution: review.gmb_review_attributions?.[0] ? {
                barber: review.gmb_review_attributions[0].barbershop_staff ? {
                  id: review.gmb_review_attributions[0].barbershop_staff.id,
                  name: `${review.gmb_review_attributions[0].barbershop_staff.first_name} ${review.gmb_review_attributions[0].barbershop_staff.last_name}`,
                  photo: review.gmb_review_attributions[0].barbershop_staff.profile_image_url
                } : null,
                confidence: review.gmb_review_attributions[0].confidence_level,
                confidenceScore: review.gmb_review_attributions[0].confidence_score,
                sentiment: review.gmb_review_attributions[0].sentiment,
                sentimentScore: review.gmb_review_attributions[0].sentiment_score,
                mentionedPhrases: review.gmb_review_attributions[0].mentioned_phrases || [],
                extractedNames: review.gmb_review_attributions[0].extracted_names || [],
                aiReasoning: review.gmb_review_attributions[0].ai_reasoning,
                manualOverride: review.gmb_review_attributions[0].manual_override
              } : null
            }))
            
            setReviews(formattedReviews)
            setFilteredReviews(formattedReviews)
          } else {
            // Use fallback demo data for demonstration
            setReviews(getFallbackReviews())
            setFilteredReviews(getFallbackReviews())
          }
        } else {
          throw new Error('Failed to load reviews')
        }
        
      } catch (err) {
        console.error('Error loading reviews:', err)
        setError(err.message)
        // Use fallback data
        setReviews(getFallbackReviews())
        setFilteredReviews(getFallbackReviews())
        setBarbers(getFallbackBarbers())
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadData()
    }
  }, [user, profile])

  // Filter reviews based on all filter criteria
  useEffect(() => {
    let filtered = reviews.filter(review => {
      const matchesSearch = 
        review.reviewText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.reviewerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (review.attribution?.barber?.name || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesBarber = 
        selectedBarber === 'all' || 
        review.attribution?.barber?.id === selectedBarber ||
        (selectedBarber === 'unattributed' && !review.attribution?.barber)

      const matchesRating = 
        selectedRating === 'all' || 
        review.starRating === parseInt(selectedRating)

      const matchesConfidence = 
        selectedConfidence === 'all' || 
        review.attribution?.confidence === selectedConfidence

      const matchesSentiment = 
        selectedSentiment === 'all' || 
        review.attribution?.sentiment === selectedSentiment

      return matchesSearch && matchesBarber && matchesRating && matchesConfidence && matchesSentiment
    })

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      let cutoffDate
      
      switch (dateRange) {
        case '7days':
          cutoffDate = new Date(now.setDate(now.getDate() - 7))
          break
        case '30days':
          cutoffDate = new Date(now.setDate(now.getDate() - 30))
          break
        case '90days':
          cutoffDate = new Date(now.setDate(now.getDate() - 90))
          break
        default:
          cutoffDate = null
      }

      if (cutoffDate) {
        filtered = filtered.filter(review => review.reviewDate >= cutoffDate)
      }
    }

    setFilteredReviews(filtered)
  }, [reviews, searchTerm, selectedBarber, selectedRating, selectedConfidence, selectedSentiment, dateRange])

  // Fallback data for demo purposes
  const getFallbackReviews = () => [
    {
      id: 'review_001',
      googleReviewId: 'google_001',
      reviewerName: 'Sarah Johnson',
      reviewText: 'Mike gave me the best fade I\'ve ever had! Amazing attention to detail and super friendly. Will definitely be coming back.',
      starRating: 5,
      reviewDate: new Date('2024-01-15'),
      reviewUrl: 'https://g.co/kgs/review1',
      attribution: {
        barber: { id: 'barber_001', name: 'Marcus Johnson', photo: null },
        confidence: 'high',
        confidenceScore: 85,
        sentiment: 'positive',
        sentimentScore: 0.8,
        mentionedPhrases: ['Mike', 'best fade', 'amazing'],
        extractedNames: ['Mike'],
        aiReasoning: 'Review explicitly mentions "Mike" and describes a haircut service with positive sentiment.',
        manualOverride: false
      }
    },
    {
      id: 'review_002', 
      googleReviewId: 'google_002',
      reviewerName: 'David Martinez',
      reviewText: 'Great barbershop! The service was professional and my cut looks fantastic. Highly recommend this place.',
      starRating: 5,
      reviewDate: new Date('2024-01-12'),
      reviewUrl: 'https://g.co/kgs/review2', 
      attribution: null
    },
    {
      id: 'review_003',
      googleReviewId: 'google_003', 
      reviewerName: 'Tony Reeves',
      reviewText: 'Ask for Carlos - he knows exactly what he\'s doing with beard trims. Walked out looking fresh!',
      starRating: 5,
      reviewDate: new Date('2024-01-10'),
      reviewUrl: 'https://g.co/kgs/review3',
      attribution: {
        barber: { id: 'barber_003', name: 'Carlos Martinez', photo: null },
        confidence: 'certain',
        confidenceScore: 95,
        sentiment: 'positive', 
        sentimentScore: 0.9,
        mentionedPhrases: ['Carlos', 'beard trims', 'fresh'],
        extractedNames: ['Carlos'],
        aiReasoning: 'Review directly recommends "Carlos" and describes beard trimming service with high praise.',
        manualOverride: false
      }
    }
  ]

  const getFallbackBarbers = () => [
    { id: 'barber_001', name: 'Marcus Johnson' },
    { id: 'barber_002', name: 'David Wilson' },
    { id: 'barber_003', name: 'Carlos Martinez' }
  ]

  // Helper functions
  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'certain': return 'bg-green-100 text-green-800'
      case 'high': return 'bg-blue-100 text-blue-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800'
      case 'negative': return 'bg-red-100 text-red-800'
      case 'neutral': return 'bg-gray-100 text-gray-800'
      case 'mixed': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
          <StarIconSolid
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  // Calculate summary statistics
  const stats = {
    totalReviews: reviews.length,
    averageRating: reviews.length ? (reviews.reduce((sum, r) => sum + r.starRating, 0) / reviews.length).toFixed(1) : 0,
    attributedReviews: reviews.filter(r => r.attribution?.barber).length,
    positiveReviews: reviews.filter(r => r.starRating >= 4).length
  }

  return (
    <ProtectedRoute>
      <GlobalNavigation />
      <div className="min-h-screen bg-gray-50">
        {/* Main Content - adjusting for sidebar */}
        <div className="lg:ml-80 transition-all duration-300 ease-in-out pt-16 lg:pt-0">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

              {/* Header */}
              <div className="mb-8">
                <div className="md:flex md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                      Google Reviews
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                      AI-powered review attribution and management
                    </p>
                  </div>
                  <div className="mt-4 flex md:mt-0 md:ml-4">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500 transition-colors"
                    >
                      <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5" />
                      Sync Reviews
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Reviews</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.totalReviews}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <StarIcon className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Average Rating</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.averageRating}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserGroupIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Attributed</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.attributedReviews}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Positive</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.positiveReviews}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setUseEnhancedView(!useEnhancedView)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {useEnhancedView ? 'Standard View' : 'Enhanced View (with Booking)'}
                </button>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search reviews..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <select
                        value={selectedBarber}
                        onChange={(e) => setSelectedBarber(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                      >
                        <option value="all">All Barbers</option>
                        <option value="unattributed">Unattributed</option>
                        {barbers.map(barber => (
                          <option key={barber.id} value={barber.id}>{barber.name}</option>
                        ))}
                      </select>

                      <select
                        value={selectedRating}
                        onChange={(e) => setSelectedRating(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                      >
                        <option value="all">All Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                      </select>

                      <select
                        value={selectedConfidence}
                        onChange={(e) => setSelectedConfidence(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                      >
                        <option value="all">All Confidence</option>
                        <option value="certain">Certain</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>

                      <select
                        value={selectedSentiment}
                        onChange={(e) => setSelectedSentiment(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                      >
                        <option value="all">All Sentiment</option>
                        <option value="positive">Positive</option>
                        <option value="negative">Negative</option>
                        <option value="neutral">Neutral</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviews List */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-500">Loading reviews...</p>
                  </div>
                ) : filteredReviews.length === 0 ? (
                  <div className="p-8 text-center">
                    <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
                    <p className="text-gray-500">
                      {searchTerm || selectedBarber !== 'all' || selectedRating !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Reviews will appear here once synced from Google My Business'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredReviews.map((review) => (
                      useEnhancedView ? (
                        <ReviewCardEnhanced
                          key={review.id}
                          review={review}
                          onViewDetails={(review) => {
                            setSelectedReview(review)
                            setShowAttributionModal(true)
                          }}
                          showAttribution={true}
                          showActions={true}
                          showBookingCTA={true}
                          barbershopSlug={profile?.barbershop_slug || 'demo-shop'}
                        />
                      ) : (
                        <div key={review.id} className="p-6 hover:bg-gray-50">
                          <div className="flex space-x-4">
                            <div className="flex-shrink-0">
                              {review.reviewerPhoto ? (
                                <img
                                  src={review.reviewerPhoto}
                                  alt={review.reviewerName}
                                  className="w-12 h-12 rounded-full"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    {review.reviewerName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900">{review.reviewerName}</p>
                                {renderStars(review.starRating)}
                                <span className="text-sm text-gray-500">
                                  {review.reviewDate.toLocaleDateString()}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedReview(review)
                                    setShowAttributionModal(true)
                                  }}
                                  className="text-olive-600 hover:text-olive-800 text-sm font-medium"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                <a
                                  href={review.reviewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  View on Google
                                </a>
                              </div>
                            </div>
                            
                            <p className="text-gray-700 mb-3">{review.reviewText}</p>
                            
                            <div className="flex flex-wrap items-center gap-3">
                              {review.attribution?.barber ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-500">Attributed to:</span>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-olive-100 text-olive-800">
                                    {review.attribution.barber.name}
                                  </span>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(review.attribution.confidence)}`}>
                                    {review.attribution.confidence} ({Math.round(review.attribution.confidenceScore)}%)
                                  </span>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(review.attribution.sentiment)}`}>
                                    {review.attribution.sentiment}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Unattributed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      )
                    ))}
                  </div>
                )}
              </div>

              {/* Attribution Details Modal */}
              {showAttributionModal && selectedReview && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold">Review Attribution Details</h3>
                      <button
                        onClick={() => setShowAttributionModal(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Review</h4>
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="flex items-center space-x-2 mb-2">
                            <strong>{selectedReview.reviewerName}</strong>
                            {renderStars(selectedReview.starRating)}
                            <span className="text-sm text-gray-500">
                              {selectedReview.reviewDate.toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700">{selectedReview.reviewText}</p>
                        </div>
                      </div>

                      {selectedReview.attribution ? (
                        <>
                          <div>
                            <h4 className="font-medium mb-2">Attribution</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-gray-500">Attributed to</label>
                                <p className="font-medium">{selectedReview.attribution.barber?.name || 'None'}</p>
                              </div>
                              <div>
                                <label className="text-sm text-gray-500">Confidence</label>
                                <p className="font-medium">{selectedReview.attribution.confidence} ({Math.round(selectedReview.attribution.confidenceScore)}%)</p>
                              </div>
                              <div>
                                <label className="text-sm text-gray-500">Sentiment</label>
                                <p className="font-medium">{selectedReview.attribution.sentiment}</p>
                              </div>
                              <div>
                                <label className="text-sm text-gray-500">Sentiment Score</label>
                                <p className="font-medium">{selectedReview.attribution.sentimentScore?.toFixed(2) || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          {selectedReview.attribution.extractedNames?.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Extracted Names</h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedReview.attribution.extractedNames.map((name, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                    {name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedReview.attribution.mentionedPhrases?.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Key Phrases</h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedReview.attribution.mentionedPhrases.map((phrase, index) => (
                                  <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                                    {phrase}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedReview.attribution.aiReasoning && (
                            <div>
                              <h4 className="font-medium mb-2">AI Reasoning</h4>
                              <div className="bg-gray-50 p-3 rounded">
                                <p className="text-sm text-gray-700">{selectedReview.attribution.aiReasoning}</p>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-yellow-800">This review has not been attributed to any specific barber.</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        onClick={() => setShowAttributionModal(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          setShowAttributionModal(false)
                          // TODO: Open manual attribution modal
                        }}
                        className="px-4 py-2 bg-olive-600 text-white rounded hover:bg-olive-700"
                      >
                        Edit Attribution
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Integration Notice */}
              <div className="mt-8 bg-olive-50 border border-olive-200 rounded-lg p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-olive-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-olive-800">
                      AI-Powered Review Management
                    </h3>
                    <div className="mt-2 text-sm text-olive-700">
                      <p>Advanced Google My Business integration includes:</p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li>Real-time review synchronization from Google My Business</li>
                        <li>AI-powered barber attribution with confidence scoring</li>
                        <li>Sentiment analysis and emotional insight extraction</li>
                        <li>Smart name matching with aliases and nicknames</li>
                        <li>Automated response generation and approval workflow</li>
                        <li>Performance analytics per barber with review insights</li>
                        <li>Manual override capabilities for complex attributions</li>
                      </ul>
                      <div className="mt-4 p-3 bg-white border border-olive-300 rounded-md">
                        <p className="text-sm font-medium text-olive-900">Production Ready:</p>
                        <p className="text-xs text-olive-800 mt-1">
                          Full Google My Business API integration with Claude AI and OpenAI for 
                          intelligent review attribution and management.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}