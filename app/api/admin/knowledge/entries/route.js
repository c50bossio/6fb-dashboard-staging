import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    // TODO: Implement proper admin role verification
    // For now, this is a placeholder - in production, verify the user has SUPER_ADMIN or KNOWLEDGE_ADMIN role

    // Get all global knowledge entries from Enhanced Business Knowledge Service
    const response = await fetch('http://localhost:8001/enhanced-knowledge/status')
    
    if (!response.ok) {
      throw new Error('Knowledge service unavailable')
    }

    const statusData = await response.json()
    
    // Return mock data for now - in production, this would fetch actual entries
    const Entries = [
      {
        id: 'global_1',
        title: 'Peak Hour Staffing Optimization',
        content: 'During peak hours (typically 10 AM - 2 PM and 5 PM - 7 PM), barbershops should increase staffing by 40-50% to maintain service quality. Data shows that shops with proper peak hour staffing see 23% higher customer satisfaction and 15% more repeat bookings.',
        domain: 'staff_management',
        confidence: 0.92,
        usage_count: 156,
        effectiveness_score: 0.88,
        source: 'industry_research',
        added_by: 'admin',
        added_at: '2025-01-15T10:30:00Z'
      },
      {
        id: 'global_2', 
        title: 'Customer Retention Through Follow-up',
        content: 'Automated follow-up messages 24-48 hours after service increase customer retention by 31%. The optimal message should thank the customer, ask for feedback, and offer a small incentive for their next visit. SMS has 3x higher engagement than email.',
        domain: 'customer_experience',
        confidence: 0.89,
        usage_count: 203,
        effectiveness_score: 0.91,
        source: 'best_practices',
        added_by: 'admin',
        added_at: '2025-01-10T14:20:00Z'
      },
      {
        id: 'global_3',
        title: 'Seasonal Marketing Patterns',
        content: 'Barbershop revenue typically increases 18-25% before major holidays and summer season. Start marketing campaigns 3-4 weeks before holidays, focus on special packages, and increase social media posting frequency by 50% during these periods.',
        domain: 'marketing_strategies',
        confidence: 0.94,
        usage_count: 98,
        effectiveness_score: 0.87,
        source: 'industry_research',
        added_by: 'admin',
        added_at: '2025-01-08T09:15:00Z'
      }
    ]

    return NextResponse.json({
      success: true,
      entries: mockEntries,
      total: mockEntries.length,
      service_status: statusData.success ? 'operational' : 'degraded'
    })

  } catch (error) {
    console.error('Admin knowledge entries error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      entries: [],
      total: 0
    }, { status: 500 })
  }
}