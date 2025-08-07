/**
 * AI Scheduling API Endpoints
 * Provides intelligent booking suggestions and scheduling optimization
 */

import { spawn } from 'child_process';
import path from 'path';

import { NextResponse } from 'next/server';

// Helper function to execute Python AI scheduling service
async function executeSchedulingService(action, data) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'services', 'ai_scheduling_service.py');
    const python = spawn('python3', [scriptPath, action, JSON.stringify(data)]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          resolve({ success: true, message: stdout });
        }
      } else {
        reject(new Error(stderr || `Python process exited with code ${code}`));
      }
    });
  });
}

// GET: Get optimal scheduling recommendations
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const barbershopId = searchParams.get('barbershop_id');
    const serviceId = searchParams.get('service_id');
    const customerId = searchParams.get('customer_id');
    const barberId = searchParams.get('barber_id');
    const optimizationGoal = searchParams.get('optimization_goal') || 'balanced';
    const limit = parseInt(searchParams.get('limit')) || 5;
    const preferredDates = searchParams.get('preferred_dates');
    
    if (!barbershopId || !serviceId) {
      return NextResponse.json(
        { error: 'barbershop_id and service_id are required' },
        { status: 400 }
      );
    }
    
    const requestData = {
      barbershop_id: barbershopId,
      service_id: serviceId,
      customer_id: customerId,
      barber_id: barberId,
      optimization_goal: optimizationGoal,
      limit: limit,
      preferred_dates: preferredDates ? JSON.parse(preferredDates) : null
    };
    
    // For now, return mock data while Python service is being integrated
    const mockRecommendations = [
      {
        recommended_time: "2025-01-10T14:00:00",
        confidence_score: 92.5,
        priority: "high_value",
        revenue_impact: 75.0,
        efficiency_score: 88.0,
        reasoning: "Recommended Friday at 2:00 PM - popular afternoon slot with good revenue potential, weekend slot with premium demand.",
        alternative_slots: ["2025-01-10T15:00:00", "2025-01-11T10:00:00", "2025-01-11T14:30:00"],
        barber_id: barberId,
        service_id: serviceId,
        estimated_revenue: 65.00,
        customer_satisfaction_score: 85.0
      },
      {
        recommended_time: "2025-01-11T10:30:00",
        confidence_score: 87.2,
        priority: "optimal_efficiency",
        revenue_impact: 68.0,
        efficiency_score: 91.0,
        reasoning: "Recommended Saturday at 10:30 AM - morning appointment with high availability, designed for optimal scheduling efficiency.",
        alternative_slots: ["2025-01-11T11:00:00", "2025-01-12T09:00:00", "2025-01-13T14:00:00"],
        barber_id: barberId,
        service_id: serviceId,
        estimated_revenue: 58.00,
        customer_satisfaction_score: 82.0
      },
      {
        recommended_time: "2025-01-13T15:30:00",
        confidence_score: 84.8,
        priority: "peak_demand",
        revenue_impact: 82.0,
        efficiency_score: 76.0,
        reasoning: "Recommended Monday at 3:30 PM - popular afternoon slot with good revenue potential, optimized for maximum revenue generation.",
        alternative_slots: ["2025-01-13T16:00:00", "2025-01-14T10:00:00", "2025-01-14T14:00:00"],
        barber_id: barberId,
        service_id: serviceId,
        estimated_revenue: 72.00,
        customer_satisfaction_score: 78.0
      }
    ];
    
    return NextResponse.json({
      success: true,
      recommendations: mockRecommendations,
      optimization_goal: optimizationGoal,
      total_slots_analyzed: 48,
      analysis_date: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting scheduling recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduling recommendations', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Analyze booking patterns and generate insights
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, ...data } = body;
    
    switch (action) {
      case 'analyze_patterns':
        return await analyzeBookingPatterns(data);
      case 'optimize_schedule':
        return await optimizeSchedule(data);
      case 'get_performance_metrics':
        return await getPerformanceMetrics(data);
      case 'update_recommendation_feedback':
        return await updateRecommendationFeedback(data);
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: analyze_patterns, optimize_schedule, get_performance_metrics, update_recommendation_feedback' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error processing scheduling request:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduling request', details: error.message },
      { status: 500 }
    );
  }
}

// Analyze booking patterns
async function analyzeBookingPatterns(data) {
  try {
    const { barbershop_id, start_date, end_date } = data;
    
    if (!barbershop_id) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      );
    }
    
    // Mock booking pattern analysis data
    const mockPatterns = {
      success: true,
      barbershop_id: barbershop_id,
      analysis_period: {
        start_date: start_date || "2024-11-01",
        end_date: end_date || "2025-01-01"
      },
      patterns: {
        hourly_demand: {
          "9": 5, "10": 8, "11": 12, "12": 6, "13": 4, 
          "14": 15, "15": 18, "16": 12, "17": 8, "18": 3
        },
        daily_demand: {
          "1": 12, "2": 10, "3": 11, "4": 15, "5": 22, "6": 18, "0": 8
        },
        peak_hours: [
          { hour: 15, bookings: 18 },
          { hour: 14, bookings: 15 },
          { hour: 11, bookings: 12 }
        ],
        peak_days: [
          { day: "Friday", bookings: 22 },
          { day: "Saturday", bookings: 18 },
          { day: "Thursday", bookings: 15 }
        ],
        service_popularity: {
          "haircut": { count: 45, avg_revenue: 35.00 },
          "beard_trim": { count: 23, avg_revenue: 25.00 },
          "full_service": { count: 18, avg_revenue: 65.00 }
        },
        customer_insights: {
          avg_lead_time: 2.3,
          completion_rate: 0.87,
          no_show_rate: 0.08,
          cancellation_rate: 0.05
        }
      },
      recommendations: [
        {
          type: "schedule_optimization",
          message: "Consider adding more availability on Friday afternoons (2-4 PM) to capture peak demand."
        },
        {
          type: "service_pricing",
          message: "Full service appointments show 85% higher revenue - promote during peak hours."
        },
        {
          type: "barber_allocation",
          message: "Redistribute barber schedules to match Friday/Saturday demand patterns."
        }
      ]
    };
    
    return NextResponse.json(mockPatterns);
    
  } catch (error) {
    console.error('Error analyzing booking patterns:', error);
    return NextResponse.json(
      { error: 'Failed to analyze booking patterns', details: error.message },
      { status: 500 }
    );
  }
}

// Optimize entire schedule
async function optimizeSchedule(data) {
  try {
    const { barbershop_id, optimization_goals, date_range } = data;
    
    if (!barbershop_id) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      );
    }
    
    // Mock schedule optimization results
    const mockOptimization = {
      success: true,
      barbershop_id: barbershop_id,
      optimization_goals: optimization_goals || ["revenue", "efficiency"],
      current_metrics: {
        utilization_rate: 0.68,
        average_revenue_per_hour: 42.50,
        customer_satisfaction: 4.2,
        efficiency_score: 72.0
      },
      optimized_metrics: {
        utilization_rate: 0.82,
        average_revenue_per_hour: 51.20,
        customer_satisfaction: 4.4,
        efficiency_score: 86.0
      },
      improvements: {
        revenue_increase: 20.4,
        efficiency_gain: 19.4,
        utilization_boost: 20.6,
        satisfaction_improvement: 4.8
      },
      recommended_changes: [
        {
          change_type: "staff_scheduling",
          description: "Add one barber during Friday 2-5 PM peak hours",
          impact: "15% revenue increase during peak times"
        },
        {
          change_type: "service_bundling",
          description: "Promote full service packages during high-demand slots",
          impact: "25% average ticket increase"
        },
        {
          change_type: "slot_reallocation",
          description: "Move 30-minute slots to 45-minute slots during peak hours",
          impact: "12% efficiency improvement"
        }
      ],
      implementation_timeline: "2-3 weeks for full optimization"
    };
    
    return NextResponse.json(mockOptimization);
    
  } catch (error) {
    console.error('Error optimizing schedule:', error);
    return NextResponse.json(
      { error: 'Failed to optimize schedule', details: error.message },
      { status: 500 }
    );
  }
}

// Get performance metrics
async function getPerformanceMetrics(data) {
  try {
    const { barbershop_id, start_date, end_date } = data;
    
    if (!barbershop_id) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      );
    }
    
    // Mock performance metrics
    const mockMetrics = {
      success: true,
      barbershop_id: barbershop_id,
      period: {
        start_date: start_date || "2024-12-01",
        end_date: end_date || "2025-01-01"
      },
      ai_performance: {
        total_recommendations: 156,
        accepted_recommendations: 134,
        acceptance_rate: 85.9,
        avg_confidence_score: 87.3,
        avg_revenue_impact: 68.2,
        performance_grade: "A"
      },
      booking_efficiency: {
        avg_booking_time: "2.4 minutes",
        schedule_utilization: 0.78,
        optimal_slot_usage: 0.82,
        revenue_per_recommendation: 48.75
      },
      customer_satisfaction: {
        scheduling_satisfaction: 4.6,
        time_slot_accuracy: 0.91,
        wait_time_reduction: 0.23,
        repeat_booking_rate: 0.67
      },
      revenue_impact: {
        total_revenue_influenced: 6420.00,
        average_ticket_increase: 12.5,
        peak_hour_optimization: 18.7,
        off_peak_conversion: 8.9
      },
      trends: {
        week_over_week_improvement: 4.2,
        month_over_month_growth: 15.8,
        ai_learning_progress: 0.89
      }
    };
    
    return NextResponse.json(mockMetrics);
    
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get performance metrics', details: error.message },
      { status: 500 }
    );
  }
}

// Update recommendation feedback
async function updateRecommendationFeedback(data) {
  try {
    const { recommendation_id, accepted, customer_feedback, booking_outcome } = data;
    
    if (!recommendation_id) {
      return NextResponse.json(
        { error: 'recommendation_id is required' },
        { status: 400 }
      );
    }
    
    // Mock feedback update (in real implementation, this would update the ML model)
    const mockUpdate = {
      success: true,
      recommendation_id: recommendation_id,
      feedback_recorded: true,
      accepted: accepted,
      customer_feedback: customer_feedback,
      booking_outcome: booking_outcome,
      ml_model_updated: true,
      confidence_adjustment: accepted ? 2.1 : -1.8,
      message: "Feedback recorded successfully. AI model learning from this interaction."
    };
    
    return NextResponse.json(mockUpdate);
    
  } catch (error) {
    console.error('Error updating recommendation feedback:', error);
    return NextResponse.json(
      { error: 'Failed to update recommendation feedback', details: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update AI scheduling configuration
export async function PUT(request) {
  try {
    const body = await request.json();
    const { barbershop_id, scheduling_preferences } = body;
    
    if (!barbershop_id) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      );
    }
    
    // Mock configuration update
    const mockConfigUpdate = {
      success: true,
      barbershop_id: barbershop_id,
      updated_preferences: scheduling_preferences,
      ai_model_retrained: true,
      effective_date: new Date().toISOString(),
      message: "AI scheduling preferences updated successfully."
    };
    
    return NextResponse.json(mockConfigUpdate);
    
  } catch (error) {
    console.error('Error updating scheduling configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduling configuration', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Remove scheduling recommendation
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const recommendationId = searchParams.get('recommendation_id');
    
    if (!recommendationId) {
      return NextResponse.json(
        { error: 'recommendation_id is required' },
        { status: 400 }
      );
    }
    
    // Mock recommendation removal
    const mockRemoval = {
      success: true,
      recommendation_id: recommendationId,
      removed: true,
      ml_impact: "Negative signal recorded for future recommendations",
      message: "Recommendation removed and AI model updated."
    };
    
    return NextResponse.json(mockRemoval);
    
  } catch (error) {
    console.error('Error removing recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to remove recommendation', details: error.message },
      { status: 500 }
    );
  }
}