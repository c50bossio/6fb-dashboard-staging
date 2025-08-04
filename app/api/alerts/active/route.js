import { NextResponse } from 'next/server';

/**
 * GET /api/alerts/active
 * Retrieve active alerts with intelligent filtering and prioritization
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const barbershopId = searchParams.get('barbershop_id');
    const userId = searchParams.get('user_id');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Validate required parameters
    if (!barbershopId || !userId) {
      return NextResponse.json(
        { error: 'barbershop_id and user_id are required parameters' },
        { status: 400 }
      );
    }
    
    // Call Python alert service
    const pythonResponse = await fetch('http://localhost:8001/intelligent-alerts/active', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barbershop_id: barbershopId,
        user_id: userId,
        priority_filter: priority,
        category_filter: category,
        limit: limit
      }),
    });
    
    if (!pythonResponse.ok) {
      throw new Error(`Python service error: ${pythonResponse.statusText}`);
    }
    
    const alertsData = await pythonResponse.json();
    
    // Enrich with real-time context
    const enrichedAlerts = alertsData.map(alert => ({
      ...alert,
      real_time_context: {
        current_time: new Date().toISOString(),
        time_since_created: calculateTimeSince(alert.created_at),
        urgency_indicator: calculateUrgencyIndicator(alert),
        requires_immediate_attention: alert.priority === 'critical' && alert.status === 'active'
      }
    }));
    
    // Apply client-side intelligent grouping
    const groupedAlerts = groupSimilarAlerts(enrichedAlerts);
    
    return NextResponse.json({
      success: true,
      data: {
        barbershop_id: barbershopId,
        user_id: userId,
        total_alerts: enrichedAlerts.length,
        alerts: enrichedAlerts,
        grouped_alerts: groupedAlerts,
        filters_applied: {
          priority: priority,
          category: category,
          limit: limit
        },
        summary: generateAlertSummary(enrichedAlerts),
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error retrieving active alerts:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve active alerts',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts/active
 * Create a new alert with intelligent prioritization
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    const { 
      barbershop_id, 
      title, 
      message, 
      category, 
      source_data, 
      metadata = {} 
    } = body;
    
    // Validate required fields
    if (!barbershop_id || !title || !message || !category || !source_data) {
      return NextResponse.json(
        { error: 'Missing required fields: barbershop_id, title, message, category, source_data' },
        { status: 400 }
      );
    }
    
    // Validate category
    const validCategories = [
      'business_metric', 'system_health', 'customer_behavior', 
      'revenue_anomaly', 'operational_issue', 'opportunity', 
      'compliance', 'security'
    ];
    
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Call Python intelligent alert service
    const pythonResponse = await fetch('http://localhost:8001/intelligent-alerts/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barbershop_id,
        title,
        message,
        category,
        source_data,
        metadata: {
          ...metadata,
          created_via: 'api',
          client_timestamp: new Date().toISOString()
        }
      }),
    });
    
    if (!pythonResponse.ok) {
      throw new Error(`Python service error: ${pythonResponse.statusText}`);
    }
    
    const newAlert = await pythonResponse.json();
    
    // Send real-time notification to connected clients
    try {
      await fetch('http://localhost:8001/realtime/alert-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershop_id,
          alert_data: newAlert,
          notification_type: 'new_alert'
        }),
      });
    } catch (realtimeError) {
      console.error('Real-time notification failed:', realtimeError);
      // Don't fail the request if real-time notification fails
    }
    
    return NextResponse.json({
      success: true,
      data: {
        alert: newAlert,
        message: 'Alert created successfully with intelligent prioritization',
        created_at: new Date().toISOString()
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create alert',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateTimeSince(createdAt) {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

function calculateUrgencyIndicator(alert) {
  const urgencyScore = alert.urgency_score || 0;
  const timeSinceCreated = new Date() - new Date(alert.created_at);
  const hoursOld = timeSinceCreated / (1000 * 60 * 60);
  
  // Increase urgency for older unresolved alerts
  let adjustedUrgency = urgencyScore;
  if (alert.status === 'active') {
    if (alert.priority === 'critical' && hoursOld > 1) {
      adjustedUrgency = Math.min(1.0, urgencyScore + 0.2);
    } else if (alert.priority === 'high' && hoursOld > 4) {
      adjustedUrgency = Math.min(1.0, urgencyScore + 0.1);
    }
  }
  
  if (adjustedUrgency >= 0.8) return 'very_high';
  if (adjustedUrgency >= 0.6) return 'high';
  if (adjustedUrgency >= 0.4) return 'medium';
  return 'low';
}

function groupSimilarAlerts(alerts) {
  const groups = {};
  
  alerts.forEach(alert => {
    const groupKey = `${alert.category}_${alert.priority}`;
    
    if (!groups[groupKey]) {
      groups[groupKey] = {
        category: alert.category,
        priority: alert.priority,
        count: 0,
        alerts: [],
        latest_alert: null,
        business_impact_sum: 0
      };
    }
    
    groups[groupKey].count++;
    groups[groupKey].alerts.push(alert);
    groups[groupKey].business_impact_sum += alert.business_impact || 0;
    
    // Keep track of most recent alert in group
    if (!groups[groupKey].latest_alert || 
        new Date(alert.created_at) > new Date(groups[groupKey].latest_alert.created_at)) {
      groups[groupKey].latest_alert = alert;
    }
  });
  
  // Convert to array and sort by priority and impact
  return Object.values(groups)
    .sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.business_impact_sum - a.business_impact_sum;
    });
}

function generateAlertSummary(alerts) {
  const summary = {
    total_alerts: alerts.length,
    by_priority: {},
    by_category: {},
    by_status: {},
    total_business_impact: 0,
    requires_immediate_attention: 0,
    average_confidence: 0
  };
  
  let totalConfidence = 0;
  
  alerts.forEach(alert => {
    // Count by priority
    summary.by_priority[alert.priority] = (summary.by_priority[alert.priority] || 0) + 1;
    
    // Count by category
    summary.by_category[alert.category] = (summary.by_category[alert.category] || 0) + 1;
    
    // Count by status
    summary.by_status[alert.status] = (summary.by_status[alert.status] || 0) + 1;
    
    // Sum business impact
    summary.total_business_impact += alert.business_impact || 0;
    
    // Count critical alerts
    if (alert.priority === 'critical' && alert.status === 'active') {
      summary.requires_immediate_attention++;
    }
    
    // Sum confidence for average
    totalConfidence += alert.confidence_score || 0;
  });
  
  summary.average_confidence = alerts.length > 0 ? totalConfidence / alerts.length : 0;
  
  return summary;
}