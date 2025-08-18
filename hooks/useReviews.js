'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function useReviews({ 
  barbershopId = null,
  barberId = null,
  locationId = null,
  enterpriseView = false,
  limit = 50,
  autoLoad = true 
} = {}) {
  const { user, profile } = useAuth()
  const [reviews, setReviews] = useState([])
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    attributedReviews: 0,
    positiveReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  })
  const [pagination, setPagination] = useState({
    total: 0,
    limit,
    offset: 0,
    hasMore: false
  })

  const loadReviews = useCallback(async (options = {}) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: options.limit || limit,
        offset: options.offset || 0
      })

      // Add filters based on view type
      if (barberId) {
        params.append('barber_id', barberId)
      } else if (locationId) {
        params.append('location_id', locationId)
      } else if (barbershopId) {
        params.append('barbershop_id', barbershopId)
      } else if (profile?.barbershop_id) {
        params.append('barbershop_id', profile.barbershop_id)
      }

      if (options.sentiment) {
        params.append('sentiment', options.sentiment)
      }
      if (options.confidence) {
        params.append('confidence', options.confidence)
      }

      const response = await fetch(`/api/gmb/reviews?${params}`)
      const result = await response.json()

      if (result.success && result.data) {
        const formattedReviews = result.data.reviews.map(review => ({
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

        if (options.append) {
          setReviews(prev => [...prev, ...formattedReviews])
        } else {
          setReviews(formattedReviews)
        }

        setPagination(result.data.pagination)
        calculateStats(formattedReviews)
      }
    } catch (err) {
      console.error('Error loading reviews:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [barbershopId, barberId, locationId, profile, limit])

  const loadBarbers = useCallback(async () => {
    try {
      const shopId = barbershopId || profile?.barbershop_id
      if (!shopId) return

      const response = await fetch(`/api/barbers?barbershop_id=${shopId}&active_only=true`)
      if (response.ok) {
        const result = await response.json()
        if (result.barbers) {
          setBarbers(result.barbers)
        }
      }
    } catch (err) {
      console.error('Error loading barbers:', err)
    }
  }, [barbershopId, profile])

  const calculateStats = (reviewsData) => {
    const total = reviewsData.length
    const avgRating = total > 0 
      ? reviewsData.reduce((sum, r) => sum + r.starRating, 0) / total 
      : 0
    const attributed = reviewsData.filter(r => r.attribution?.barber).length
    const positive = reviewsData.filter(r => r.starRating >= 4).length

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviewsData.forEach(review => {
      if (distribution[review.starRating] !== undefined) {
        distribution[review.starRating]++
      }
    })

    setStats({
      totalReviews: total,
      averageRating: avgRating,
      attributedReviews: attributed,
      positiveReviews: positive,
      ratingDistribution: distribution
    })
  }

  const refreshReviews = useCallback(() => {
    return loadReviews()
  }, [loadReviews])

  const loadMore = useCallback(() => {
    if (pagination.hasMore) {
      return loadReviews({
        offset: pagination.offset + pagination.limit,
        append: true
      })
    }
  }, [loadReviews, pagination])

  const syncReviews = useCallback(async () => {
    try {
      setLoading(true)
      const shopId = barbershopId || profile?.barbershop_id
      
      const response = await fetch('/api/gmb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barbershop_id: shopId })
      })

      if (response.ok) {
        await loadReviews()
        return { success: true }
      } else {
        throw new Error('Failed to sync reviews')
      }
    } catch (err) {
      console.error('Error syncing reviews:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [barbershopId, profile, loadReviews])

  // Auto-load reviews on mount
  useEffect(() => {
    if (autoLoad && user) {
      loadReviews()
      loadBarbers()
    }
  }, [autoLoad, user, loadReviews, loadBarbers])

  return {
    reviews,
    barbers,
    stats,
    loading,
    error,
    pagination,
    refreshReviews,
    loadMore,
    syncReviews
  }
}