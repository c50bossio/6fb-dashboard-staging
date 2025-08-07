import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Return demo data showing what would be extracted from a typical barbershop Notion workspace
    const demoData = {
      sample_extractions: [
        {
          page_title: 'Standard Operating Procedures - Daily Opening',
          extracted_content: 'Daily opening checklist: 1. Unlock and disarm security system, 2. Turn on all lights and equipment, 3. Check sanitation station supplies, 4. Review daily appointments, 5. Prepare workstations with clean tools...',
          detected_domain: 'barbershop_operations',
          confidence_score: 0.94,
          business_metrics: {
            time_periods: [['30', 'minutes']],
            has_roi_data: false
          },
          tags: ['opening', 'checklist', 'sanitation', 'tools', 'procedure']
        },
        {
          page_title: 'Customer Retention Strategies That Work',
          extracted_content: 'Follow-up text messages sent 24-48 hours after service increase retention by 31%. Template: "Hi [Name], hope you love your new look! Rate your experience and get 10% off your next visit: [link]"',
          detected_domain: 'customer_experience',
          confidence_score: 0.91,
          business_metrics: {
            improvement_percentages: [31, 10],
            time_periods: [['24', 'hours'], ['48', 'hours']],
            has_roi_data: true
          },
          tags: ['retention', 'follow up', 'text message', 'template', 'discount']
        },
        {
          page_title: 'Peak Hour Staffing Strategy',
          extracted_content: 'During busy periods (10 AM - 2 PM, 5 PM - 7 PM), increase staff by 50%. This reduces wait times from average 25 minutes to 8 minutes, improving customer satisfaction scores by 40%.',
          detected_domain: 'staff_management',
          confidence_score: 0.89,
          business_metrics: {
            improvement_percentages: [50, 40],
            time_periods: [['25', 'minutes'], ['8', 'minutes']],
            has_roi_data: true
          },
          tags: ['staffing', 'peak hours', 'wait time', 'satisfaction', 'strategy']
        },
        {
          page_title: 'Social Media Marketing ROI Analysis',
          extracted_content: 'Instagram before/after posts generate 3x more bookings than regular posts. Best performing times: Tuesday 6 PM, Thursday 7 PM, Saturday 11 AM. Average cost per booking: $2.40 vs industry average $8.50.',
          detected_domain: 'marketing_strategies',
          confidence_score: 0.92,
          business_metrics: {
            improvement_percentages: [3],
            dollar_amounts: ['2.40', '8.50'],
            has_roi_data: true
          },
          tags: ['instagram', 'social media', 'booking', 'roi', 'cost', 'industry average']
        }
      ],
      extraction_summary: {
        total_pages_analyzed: 47,
        knowledge_entries_created: 23,
        domains_covered: [
          'barbershop_operations', 'customer_experience',
          'staff_management', 'marketing_strategies',
          'revenue_optimization'
        ],
        average_confidence_score: 0.87,
        business_metrics_found: 15,
        actionable_strategies: 23
      },
      estimated_ai_improvement: {
        before_extraction: {
          average_confidence: '65%',
          domain_coverage: 'Generic business advice',
          actionability: 'Low - theoretical recommendations'
        },
        after_extraction: {
          average_confidence: '91%',
          domain_coverage: 'Barbershop-specific expertise',
          actionability: 'High - proven strategies with metrics'
        }
      }
    }

    return NextResponse.json({
      success: true,
      demo_data: demoData,
      message: 'This shows what your actual Notion extraction would look like',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Demo data generation failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}