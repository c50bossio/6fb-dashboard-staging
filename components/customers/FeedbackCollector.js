/**
 * FeedbackCollector Component
 * Comprehensive feedback collection interface for customer reviews, NPS, and surveys
 */

import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Textarea } from '../ui/Textarea'
import { Input } from '../ui/Input'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Tabs } from '../ui/tabs'
import { toast } from '../ui/toast'
import { StarIcon, ThumbsUpIcon, ThumbsDownIcon, SendIcon, MessageSquareIcon, BarChart3Icon } from 'lucide-react'

const FeedbackCollector = ({
  customerId,
  appointmentId = null,
  barberId = null,
  isOpen = false,
  onClose,
  onSubmit,
  mode = 'modal', // 'modal', 'inline', 'widget'
  feedbackType = 'review', // 'review', 'nps', 'csat', 'survey'
  showTypeSelector = true,
  title = 'Share Your Experience',
  subtitle = 'Your feedback helps us improve our service',
  className = ''
}) => {
  const [selectedType, setSelectedType] = useState(feedbackType)
  const [formData, setFormData] = useState({
    rating: 0,
    npsScore: null,
    title: '',
    comment: '',
    serviceAspects: {},
    wouldRecommend: null,
    anonymous: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [hoveredRating, setHoveredRating] = useState(0)

  // Reset form when feedback type changes
  useEffect(() => {
    setFormData({
      rating: 0,
      npsScore: null,
      title: '',
      comment: '',
      serviceAspects: {},
      wouldRecommend: null,
      anonymous: false
    })
    setErrors({})
  }, [selectedType])

  // Feedback type configurations
  const feedbackTypes = {
    review: {
      label: 'Review',
      icon: StarIcon,
      description: 'Rate your overall experience',
      requiresRating: true,
      ratingLabel: 'Overall Experience',
      ratingMax: 5
    },
    nps: {
      label: 'Net Promoter Score',
      icon: BarChart3Icon,
      description: 'How likely are you to recommend us?',
      requiresRating: true,
      ratingLabel: 'Likelihood to Recommend',
      ratingMax: 10,
      useNPS: true
    },
    csat: {
      label: 'Satisfaction',
      icon: ThumbsUpIcon,
      description: 'How satisfied are you with our service?',
      requiresRating: true,
      ratingLabel: 'Satisfaction Level',
      ratingMax: 5
    },
    survey: {
      label: 'Survey',
      icon: MessageSquareIcon,
      description: 'Tell us about your experience',
      requiresRating: false
    }
  }

  // Service aspects for detailed feedback
  const serviceAspects = [
    { key: 'quality', label: 'Service Quality' },
    { key: 'cleanliness', label: 'Cleanliness' },
    { key: 'staff', label: 'Staff Friendliness' },
    { key: 'wait_time', label: 'Wait Time' },
    { key: 'value', label: 'Value for Money' },
    { key: 'atmosphere', label: 'Atmosphere' }
  ]

  const validateForm = () => {
    const newErrors = {}
    const config = feedbackTypes[selectedType]

    // Validate required rating
    if (config.requiresRating) {
      if (config.useNPS && (formData.npsScore === null || formData.npsScore === undefined)) {
        newErrors.npsScore = 'Please provide a score'
      } else if (!config.useNPS && formData.rating === 0) {
        newErrors.rating = 'Please provide a rating'
      }
    }

    // Validate comment for certain types
    if (selectedType === 'survey' && !formData.comment.trim()) {
      newErrors.comment = 'Please share your feedback'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const submissionData = {
        customer_id: customerId,
        appointment_id: appointmentId,
        barber_id: barberId,
        feedback_type: selectedType,
        rating: selectedType !== 'nps' ? formData.rating || null : null,
        nps_score: selectedType === 'nps' ? formData.npsScore : null,
        title: formData.title || null,
        comment: formData.comment || null,
        service_aspects: Object.keys(formData.serviceAspects).length > 0 ? formData.serviceAspects : null,
        would_recommend: formData.wouldRecommend,
        anonymous: formData.anonymous
      }

      // Call API to submit feedback
      const response = await fetch('/api/customers/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase_auth_token')}`
        },
        body: JSON.stringify(submissionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit feedback')
      }

      const result = await response.json()

      // Success handling
      toast({
        title: 'Thank you for your feedback!',
        description: 'Your feedback has been submitted successfully.',
        variant: 'success'
      })

      // Reset form
      setFormData({
        rating: 0,
        npsScore: null,
        title: '',
        comment: '',
        serviceAspects: {},
        wouldRecommend: null,
        anonymous: false
      })

      // Call callback if provided
      if (onSubmit) {
        onSubmit(result)
      }

      // Close modal if in modal mode
      if (mode === 'modal' && onClose) {
        onClose()
      }

    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit feedback. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderRatingInput = () => {
    const config = feedbackTypes[selectedType]
    
    if (config.useNPS) {
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            {config.ratingLabel} (0-10)
          </label>
          <div className="flex flex-wrap gap-2">
            {[...Array(11)].map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, npsScore: index }))}
                className={`
                  w-10 h-10 rounded-lg border-2 font-medium transition-all
                  ${formData.npsScore === index
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-300 hover:border-blue-300'
                  }
                `}
              >
                {index}
              </button>
            ))}
          </div>
          {formData.npsScore !== null && (
            <div className="text-sm text-gray-600">
              {formData.npsScore >= 9 ? 'Promoter' : formData.npsScore >= 7 ? 'Passive' : 'Detractor'}
            </div>
          )}
          {errors.npsScore && (
            <p className="text-sm text-red-600">{errors.npsScore}</p>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {config.ratingLabel}
        </label>
        <div className="flex gap-1">
          {[...Array(config.ratingMax)].map((_, index) => {
            const starValue = index + 1
            return (
              <button
                key={index}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, rating: starValue }))}
                onMouseEnter={() => setHoveredRating(starValue)}
                onMouseLeave={() => setHoveredRating(0)}
                className="text-2xl transition-colors"
              >
                <StarIcon 
                  className={`
                    w-8 h-8 transition-colors
                    ${(hoveredRating >= starValue || formData.rating >= starValue)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                    }
                  `}
                />
              </button>
            )
          })}
        </div>
        {errors.rating && (
          <p className="text-sm text-red-600">{errors.rating}</p>
        )}
      </div>
    )
  }

  const renderServiceAspects = () => {
    if (selectedType === 'nps') return null

    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Rate Specific Aspects (Optional)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {serviceAspects.map(aspect => (
            <div key={aspect.key} className="flex items-center justify-between">
              <span className="text-sm">{aspect.label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      serviceAspects: {
                        ...prev.serviceAspects,
                        [aspect.key]: rating
                      }
                    }))}
                    className="text-sm"
                  >
                    <StarIcon 
                      className={`
                        w-4 h-4 transition-colors
                        ${(formData.serviceAspects[aspect.key] || 0) >= rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                        }
                      `}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Feedback Type Selector */}
      {showTypeSelector && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Feedback Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(feedbackTypes).map(([type, config]) => {
              const Icon = config.icon
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`
                    p-3 rounded-lg border-2 text-center transition-all
                    ${selectedType === type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-xs font-medium">{config.label}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Rating Input */}
      {feedbackTypes[selectedType].requiresRating && renderRatingInput()}

      {/* Service Aspects */}
      {renderServiceAspects()}

      {/* Title Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Title (Optional)
        </label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Brief summary of your experience"
          maxLength={100}
        />
      </div>

      {/* Comment Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {selectedType === 'survey' ? 'Comments *' : 'Comments (Optional)'}
        </label>
        <Textarea
          value={formData.comment}
          onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
          placeholder="Tell us about your experience..."
          rows={4}
          maxLength={2000}
        />
        {errors.comment && (
          <p className="text-sm text-red-600">{errors.comment}</p>
        )}
      </div>

      {/* Recommendation Question */}
      {selectedType !== 'nps' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Would you recommend us to others?
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, wouldRecommend: true }))}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                ${formData.wouldRecommend === true
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:border-green-300'
                }
              `}
            >
              <ThumbsUpIcon className="w-4 h-4" />
              Yes
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, wouldRecommend: false }))}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                ${formData.wouldRecommend === false
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 hover:border-red-300'
                }
              `}
            >
              <ThumbsDownIcon className="w-4 h-4" />
              No
            </button>
          </div>
        </div>
      )}

      {/* Anonymous Option */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="anonymous"
          checked={formData.anonymous}
          onChange={(e) => setFormData(prev => ({ ...prev, anonymous: e.target.checked }))}
          className="rounded border-gray-300"
        />
        <label htmlFor="anonymous" className="text-sm text-gray-700">
          Submit anonymously
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            <>
              <SendIcon className="w-4 h-4 mr-2" />
              Submit Feedback
            </>
          )}
        </Button>
        {mode === 'modal' && onClose && (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  )

  // Widget mode - floating button
  if (mode === 'widget') {
    const [isWidgetOpen, setIsWidgetOpen] = useState(false)
    
    return (
      <>
        <button
          onClick={() => setIsWidgetOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all z-50"
        >
          <MessageSquareIcon className="w-6 h-6" />
        </button>
        
        {isWidgetOpen && (
          <Modal
            isOpen={isWidgetOpen}
            onClose={() => setIsWidgetOpen(false)}
            title={title}
            subtitle={subtitle}
          >
            {renderForm()}
          </Modal>
        )}
      </>
    )
  }

  // Inline mode
  if (mode === 'inline') {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
        {renderForm()}
      </Card>
    )
  }

  // Modal mode
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth="md"
    >
      {renderForm()}
    </Modal>
  )
}

export default FeedbackCollector