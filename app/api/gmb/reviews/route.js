import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/gmb/reviews
 * Get reviews with attribution data for a barbershop
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')
    const barberId = searchParams.get('barber_id')
    const sentiment = searchParams.get('sentiment')
    const confidence = searchParams.get('confidence')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'barbershop_id is required'
      }, { status: 400 })
    }

    let query = supabase
      .from('gmb_reviews')
      .select(`
        id,
        google_review_id,
        reviewer_name,
        reviewer_profile_photo_url,
        review_text,
        star_rating,
        review_date,
        review_url,
        gmb_review_attributions (
          barber_id,
          confidence_level,
          confidence_score,
          sentiment,
          sentiment_score,
          mentioned_phrases,
          extracted_names,
          ai_reasoning,
          manual_override,
          barbershop_staff (
            id,
            first_name,
            last_name,
            profile_image_url
          )
        ),
        gmb_accounts!inner (
          barbershop_id,
          business_name
        )
      `)
      .eq('gmb_accounts.barbershop_id', barbershopId)
      .order('review_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (barberId) {
      query = query.eq('gmb_review_attributions.barber_id', barberId)
    }
    if (sentiment) {
      query = query.eq('gmb_review_attributions.sentiment', sentiment)
    }
    if (confidence) {
      query = query.eq('gmb_review_attributions.confidence_level', confidence)
    }

    const { data: reviews, error } = await query

    if (error) {
      throw error
    }

    let countQuery = supabase
      .from('gmb_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('gmb_accounts.barbershop_id', barbershopId)

    if (barberId) {
      countQuery = countQuery.eq('gmb_review_attributions.barber_id', barberId)
    }

    const { count } = await countQuery

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviews || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (count || 0) > offset + limit
        }
      }
    })

  } catch (error) {
    console.error('Error fetching GMB reviews:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch reviews'
    }, { status: 500 })
  }
}

/**
 * POST /api/gmb/reviews/respond
 * Generate and post automated response to a review
 */
export async function POST(request) {
  try {
    const { review_id, response_text, auto_publish = false } = await request.json()

    if (!review_id || !response_text) {
      return NextResponse.json({
        success: false,
        error: 'review_id and response_text are required'
      }, { status: 400 })
    }

    const { data: reviewData, error: reviewError } = await supabase
      .from('gmb_reviews')
      .select(`
        id,
        google_review_id,
        gmb_accounts (
          id,
          gmb_location_id,
          access_token,
          business_name
        )
      `)
      .eq('id', review_id)
      .single()

    if (reviewError || !reviewData) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      }, { status: 404 })
    }

    const { data: responseData, error: saveError } = await supabase
      .from('gmb_review_responses')
      .insert({
        review_id,
        gmb_account_id: reviewData.gmb_accounts.id,
        response_text,
        response_type: 'ai_generated',
        requires_approval: !auto_publish,
        approval_status: auto_publish ? 'auto_approved' : 'pending'
      })
      .select()
      .single()

    if (saveError) {
      throw saveError
    }

    if (auto_publish) {
      try {
        const gmbResult = await postResponseToGMB(
          reviewData.gmb_accounts.gmb_location_id,
          reviewData.google_review_id,
          response_text,
          reviewData.gmb_accounts.access_token
        )

        await supabase
          .from('gmb_review_responses')
          .update({
            published_to_gmb: true,
            published_at: new Date().toISOString(),
            gmb_response_id: gmbResult.response_id
          })
          .eq('id', responseData.id)

      } catch (publishError) {
        console.error('Failed to publish to GMB:', publishError)
        
        await supabase
          .from('gmb_review_responses')
          .update({
            publish_error: publishError.message
          })
          .eq('id', responseData.id)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        response_id: responseData.id,
        published: auto_publish,
        status: auto_publish ? 'published' : 'pending_approval'
      }
    })

  } catch (error) {
    console.error('Error creating review response:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create response'
    }, { status: 500 })
  }
}

/**
 * Post response to Google My Business
 */
async function postResponseToGMB(locationId, reviewName, responseText, accessToken) {
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}/reviews/${reviewName}/reply`
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      comment: responseText
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GMB API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return {
    response_id: data.name,
    update_time: data.updateTime
  }
}