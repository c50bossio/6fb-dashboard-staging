import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * AI Data Query Endpoint
 *
 * Natural language to SQL interface for business intelligence queries.
 * Provides secure, context-aware database access for the AI Widget.
 *
 * Features:
 * - Natural language query understanding
 * - SQL generation with semantic layer
 * - Row-Level Security (RLS) enforcement
 * - Read-only query validation
 * - Rate limiting protection
 *
 * Security:
 * - Only SELECT queries allowed
 * - Filtered by user's barbershop_id
 * - SQL injection prevention via parameterized queries
 * - Query whitelist validation
 *
 * TODO: Full implementation in Phase 3
 */
export async function POST(request) {
  try {
    // Authentication check
    const supabase = await createClient()

    // Get user from session
    let user = null
    try {
      const { data: { user: sessionUser } } = await supabase.auth.getUser()
      user = sessionUser
    } catch (authError) {
      console.log('Auth check failed:', authError)
    }

    // Allow demo mode in development
    const isDemoMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true'

    if (!user && !isDemoMode) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use demo user if in dev mode
    const effectiveUser = user || { id: 'demo-user', email: 'demo@barbershop.com' }

    const { message, barbershopId, conversationHistory } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // TODO: Implement natural language to SQL with LLM
    // TODO: Add semantic layer for business terminology mapping
    // TODO: Generate and validate SQL query
    // TODO: Execute query with RLS context
    // TODO: Format results in natural language

    // Placeholder response with intelligent routing
    const response = generatePlaceholderResponse(message, barbershopId)

    return NextResponse.json({
      success: true,
      response: response.text,
      queryResults: response.data,
      confidence: 0.85,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI Data Query error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Placeholder response generator
 * TODO: Replace with actual LLM-powered text-to-SQL in Phase 3
 */
function generatePlaceholderResponse(message, barbershopId) {
  const messageLower = message.toLowerCase()

  // Revenue queries
  if (messageLower.includes('revenue') || messageLower.includes('money') || messageLower.includes('income')) {
    return {
      text: `📊 **Revenue Analysis**

Based on your data, here's your revenue overview:

**This Week:** $3,247
**Last Week:** $2,821 (+15% 📈)
**Monthly Total:** $12,459

**Top Services:**
• Haircut & Styling: $1,850
• Beard Trim: $847
• Hot Towel Shave: $550

*Note: This is placeholder data. Full database integration coming in Phase 3.*`,
      data: {
        thisWeek: 3247,
        lastWeek: 2821,
        change: '+15%',
        monthly: 12459
      }
    }
  }

  // Appointment queries
  if (messageLower.includes('appointment') || messageLower.includes('booking') || messageLower.includes('schedule')) {
    return {
      text: `📅 **Appointment Overview**

**Today:** 8 appointments (6 confirmed, 2 pending)
**This Week:** 42 appointments
**Completion Rate:** 92%

**Peak Hours:** 10am-2pm, 5pm-7pm
**No-Shows This Week:** 2 (4.8%)

*Note: This is placeholder data. Full database integration coming in Phase 3.*`,
      data: {
        today: 8,
        thisWeek: 42,
        completionRate: '92%'
      }
    }
  }

  // Customer queries
  if (messageLower.includes('customer') || messageLower.includes('client') || messageLower.includes('top')) {
    return {
      text: `👥 **Customer Insights**

**Total Customers:** 287
**New This Month:** 23
**Retention Rate:** 78%

**Top Customers (by spending):**
1. John Smith - $450/month
2. Mike Johnson - $380/month
3. David Williams - $340/month

**Loyalty Tiers:**
• Gold: 15 customers
• Silver: 45 customers
• Bronze: 227 customers

*Note: This is placeholder data. Full database integration coming in Phase 3.*`,
      data: {
        total: 287,
        newThisMonth: 23,
        retentionRate: '78%'
      }
    }
  }

  // No-show queries
  if (messageLower.includes('no-show') || messageLower.includes('no show') || messageLower.includes('missed')) {
    return {
      text: `⚠️ **No-Show Analysis**

**This Week:** 2 no-shows (4.8% of appointments)
**This Month:** 7 no-shows (5.2% of appointments)

**Impact:** Lost revenue ~$315

**Recommendations:**
• Implement 24-hour confirmation reminders
• Consider deposit requirements for repeat no-shows
• Send appointment reminder texts 2 hours before

*Note: This is placeholder data. Full database integration coming in Phase 3.*`,
      data: {
        thisWeek: 2,
        thisMonth: 7,
        rate: '5.2%'
      }
    }
  }

  // Default response
  return {
    text: `🤖 **AI Assistant Ready**

I can help you with:

💰 **Revenue & Finance**
• "What's my revenue this week?"
• "Show me my most profitable services"

📅 **Appointments**
• "How many appointments do I have today?"
• "What's my no-show rate?"

👥 **Customers**
• "Show me my top customers"
• "What's my customer retention rate?"

📊 **Business Insights**
• "What are my peak hours?"
• "How's my business performing?"

*Full database integration coming in Phase 3. Currently showing example responses.*`,
    data: null
  }
}
