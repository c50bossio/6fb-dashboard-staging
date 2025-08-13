'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ChatBubbleBottomCenterTextIcon, FaceSmileIcon, FaceFrownIcon } from '@heroicons/react/24/outline'
import { toast } from '@/hooks/use-toast'

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('general')
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  // Auto-show feedback widget after 30 seconds for new users
  useEffect(() => {
    const hasSeenWidget = localStorage.getItem('feedback-widget-seen')
    if (!hasSeenWidget) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        localStorage.setItem('feedback-widget-seen', 'true')
      }, 30000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          rating,
          message,
          email,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      })

      if (response.ok) {
        setShowThankYou(true)
        setTimeout(() => {
          setIsOpen(false)
          setShowThankYou(false)
          resetForm()
        }, 3000)
        
        toast({
          title: "Thank you for your feedback!",
          description: "We appreciate your input and will use it to improve.",
          variant: "success"
        })
      } else {
        throw new Error('Failed to submit feedback')
      }
    } catch (error) {
      console.error('Feedback submission error:', error)
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFeedbackType('general')
    setRating(0)
    setMessage('')
    setEmail('')
  }

  if (showThankYou) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl p-6 max-w-sm animate-in slide-in-from-bottom-5">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <FaceSmileIcon className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Thank You!</h3>
          <p className="mt-2 text-sm text-gray-500">
            Your feedback helps us improve the experience for everyone.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Feedback Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-colors group"
          aria-label="Open feedback form"
        >
          <ChatBubbleBottomCenterTextIcon className="h-6 w-6" />
          <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Send Feedback
          </span>
        </button>
      )}

      {/* Feedback Form */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl w-96 max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-5">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Send Feedback</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Close feedback form"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's your feedback about?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['bug', 'feature', 'general'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFeedbackType(type)}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      feedbackType === type
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How would you rate your experience?
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-2xl transition-transform hover:scale-110"
                    aria-label={`Rate ${star} stars`}
                  >
                    <span className={rating >= star ? 'text-yellow-400' : 'text-gray-300'}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 mb-2">
                Your feedback
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us what you think..."
              />
            </div>

            {/* Email (optional) */}
            <div>
              <label htmlFor="feedback-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email (optional)
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                If you'd like us to follow up with you
              </p>
            </div>

            {/* Submit */}
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={isSubmitting || !message}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}