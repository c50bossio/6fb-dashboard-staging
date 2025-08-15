import { NextResponse } from 'next/server';
export const runtime = 'edge'

/**
 * POST /api/alerts/acknowledge
 * Acknowledge and dismiss alerts with user feedback
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    const { 
      alert_id, 
      user_id, 
      action = 'acknowledge', // 'acknowledge', 'dismiss', 'resolve', 'snooze'
      notes, 
      feedback,
      snooze_until,
      reason 
    } = body;
    
    if (!alert_id || !user_id || !action) {
      return NextResponse.json(
        { error: 'alert_id, user_id, and action are required' },
        { status: 400 }
      );
    }
    
    const validActions = ['acknowledge', 'dismiss', 'resolve', 'snooze'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    
    let result;
    
    switch (action) {
      case 'acknowledge':
        result = await handleAcknowledge(alert_id, user_id, notes, startTime);
        break;
        
      case 'dismiss':
        result = await handleDismiss(alert_id, user_id, feedback, reason, startTime);
        break;
        
      case 'resolve':
        result = await handleResolve(alert_id, user_id, notes, reason, startTime);
        break;
        
      case 'snooze':
        result = await handleSnooze(alert_id, user_id, snooze_until, notes, startTime);
        break;
        
      default:
        throw new Error(`Unhandled action: ${action}`);
    }
    
    try {
      await sendRealtimeUpdate(alert_id, user_id, action, result);
    } catch (realtimeError) {
      console.error('Real-time update failed:', realtimeError);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        alert_id,
        user_id,
        action,
        result,
        response_time_ms: Date.now() - startTime,
        processed_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error processing alert action:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process alert action',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts/acknowledge
 * Get acknowledgment history and statistics
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const alertId = searchParams.get('alert_id');
    const userId = searchParams.get('user_id');
    const barbershopId = searchParams.get('barbershop_id');
    const days = parseInt(searchParams.get('days') || '7');
    
    if (!userId || !barbershopId) {
      return NextResponse.json(
        { error: 'user_id and barbershop_id are required parameters' },
        { status: 400 }
      );
    }
    
    const historyResponse = await fetch('http://localhost:8001/intelligent-alerts/acknowledgment-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        alert_id: alertId,
        user_id: userId,
        barbershop_id: barbershopId,
        days: days
      }),
    });
    
    if (!historyResponse.ok) {
      throw new Error(`Python service error: ${historyResponse.statusText}`);
    }
    
    const historyData = await historyResponse.json();
    
    const responseTimeStats = calculateResponseTimeStats(historyData.interactions || []);
    
    const engagementInsights = generateEngagementInsights(historyData);
    
    return NextResponse.json({
      success: true,
      data: {
        alert_id: alertId,
        user_id: userId,
        barbershop_id: barbershopId,
        time_period_days: days,
        acknowledgment_history: historyData,
        response_time_statistics: responseTimeStats,
        engagement_insights: engagementInsights,
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error getting acknowledgment history:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get acknowledgment history',
        details: error.message 
      },
      { status: 500 }
    );
  }
}


async function handleAcknowledge(alertId, userId, notes, startTime) {
  const acknowledgeResponse = await fetch('http://localhost:8001/intelligent-alerts/acknowledge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      alert_id: alertId,
      user_id: userId,
      notes: notes || '',
      response_time: (Date.now() - startTime) / 1000, // Convert to seconds
      timestamp: new Date().toISOString()
    }),
  });
  
  if (!acknowledgeResponse.ok) {
    throw new Error(`Acknowledge failed: ${acknowledgeResponse.statusText}`);
  }
  
  const result = await acknowledgeResponse.json();
  
  return {
    status: 'acknowledged',
    message: 'Alert acknowledged successfully',
    notes,
    ...result
  };
}

async function handleDismiss(alertId, userId, feedback, reason, startTime) {
  const dismissResponse = await fetch('http://localhost:8001/intelligent-alerts/dismiss', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      alert_id: alertId,
      user_id: userId,
      feedback: feedback || '',
      reason: reason || '',
      response_time: (Date.now() - startTime) / 1000,
      timestamp: new Date().toISOString()
    }),
  });
  
  if (!dismissResponse.ok) {
    throw new Error(`Dismiss failed: ${dismissResponse.statusText}`);
  }
  
  const result = await dismissResponse.json();
  
  if (feedback && feedback.includes('spam')) {
    try {
      await fetch('http://localhost:8001/intelligent-alerts/learn-spam-pattern', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert_id: alertId,
          user_id: userId,
          spam_indicators: extractSpamIndicators(feedback)
        }),
      });
    } catch (spamLearningError) {
      console.error('Spam learning failed:', spamLearningError);
    }
  }
  
  return {
    status: 'dismissed',
    message: 'Alert dismissed successfully',
    feedback,
    reason,
    ml_learning_applied: !!feedback,
    ...result
  };
}

async function handleResolve(alertId, userId, notes, reason, startTime) {
  const resolveResponse = await fetch('http://localhost:8001/intelligent-alerts/resolve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      alert_id: alertId,
      user_id: userId,
      resolution_notes: notes || '',
      resolution_reason: reason || '',
      response_time: (Date.now() - startTime) / 1000,
      resolved_at: new Date().toISOString()
    }),
  });
  
  if (!resolveResponse.ok) {
    throw new Error(`Resolve failed: ${resolveResponse.statusText}`);
  }
  
  const result = await resolveResponse.json();
  
  return {
    status: 'resolved',
    message: 'Alert resolved successfully',
    resolution_notes: notes,
    resolution_reason: reason,
    ...result
  };
}

async function handleSnooze(alertId, userId, snoozeUntil, notes, startTime) {
  if (!snoozeUntil) {
    throw new Error('snooze_until is required for snooze action');
  }
  
  const snoozeDate = new Date(snoozeUntil);
  if (snoozeDate <= new Date()) {
    throw new Error('snooze_until must be in the future');
  }
  
  const snoozeResponse = await fetch('http://localhost:8001/intelligent-alerts/snooze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      alert_id: alertId,
      user_id: userId,
      snooze_until: snoozeUntil,
      snooze_notes: notes || '',
      response_time: (Date.now() - startTime) / 1000,
      snoozed_at: new Date().toISOString()
    }),
  });
  
  if (!snoozeResponse.ok) {
    throw new Error(`Snooze failed: ${snoozeResponse.statusText}`);
  }
  
  const result = await snoozeResponse.json();
  
  return {
    status: 'snoozed',
    message: 'Alert snoozed successfully',
    snooze_until: snoozeUntil,
    snooze_duration: calculateSnoozeDuration(snoozeUntil),
    notes,
    ...result
  };
}

async function sendRealtimeUpdate(alertId, userId, action, result) {
  await fetch('http://localhost:8001/realtime/alert-action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      alert_id: alertId,
      user_id: userId,
      action,
      result,
      timestamp: new Date().toISOString()
    }),
  });
}

function calculateResponseTimeStats(interactions) {
  if (!interactions || interactions.length === 0) {
    return {
      average_response_time: 0,
      median_response_time: 0,
      fastest_response: 0,
      slowest_response: 0,
      total_interactions: 0
    };
  }
  
  const responseTimes = interactions
    .filter(interaction => interaction.response_time && interaction.response_time > 0)
    .map(interaction => interaction.response_time);
  
  if (responseTimes.length === 0) {
    return {
      average_response_time: 0,
      median_response_time: 0,
      fastest_response: 0,
      slowest_response: 0,
      total_interactions: interactions.length
    };
  }
  
  responseTimes.sort((a, b) => a - b);
  
  return {
    average_response_time: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
    median_response_time: responseTimes[Math.floor(responseTimes.length / 2)],
    fastest_response: responseTimes[0],
    slowest_response: responseTimes[responseTimes.length - 1],
    total_interactions: interactions.length,
    response_time_distribution: {
      '< 30s': responseTimes.filter(t => t < 30).length,
      '30s - 2m': responseTimes.filter(t => t >= 30 && t < 120).length,
      '2m - 10m': responseTimes.filter(t => t >= 120 && t < 600).length,
      '> 10m': responseTimes.filter(t => t >= 600).length
    }
  };
}

function generateEngagementInsights(historyData) {
  const interactions = historyData.interactions || [];
  const totalAlerts = historyData.total_alerts || 0;
  
  if (totalAlerts === 0) {
    return {
      engagement_rate: 0,
      dismissal_rate: 0,
      resolution_rate: 0,
      average_response_quality: 0,
      insights: []
    };
  }
  
  const acknowledgedCount = interactions.filter(i => i.interaction_type === 'acknowledged').length;
  const dismissedCount = interactions.filter(i => i.interaction_type === 'dismissed').length;
  const resolvedCount = interactions.filter(i => i.interaction_type === 'resolved').length;
  
  const engagementRate = (acknowledgedCount + resolvedCount) / totalAlerts;
  const dismissalRate = dismissedCount / totalAlerts;
  const resolutionRate = resolvedCount / totalAlerts;
  
  const insights = [];
  
  if (engagementRate > 0.8) {
    insights.push('High alert engagement - user actively responds to alerts');
  } else if (engagementRate < 0.3) {
    insights.push('Low alert engagement - consider reviewing alert relevance');
  }
  
  if (dismissalRate > 0.4) {
    insights.push('High dismissal rate - alerts may need better prioritization');
  }
  
  if (resolutionRate > 0.6) {
    insights.push('High resolution rate - alerts are actionable and valuable');
  }
  
  return {
    engagement_rate: engagementRate,
    dismissal_rate: dismissalRate,
    resolution_rate: resolutionRate,
    average_response_quality: (engagementRate + resolutionRate - dismissalRate * 0.5) / 2,
    insights,
    interaction_breakdown: {
      acknowledged: acknowledgedCount,
      dismissed: dismissedCount,
      resolved: resolvedCount,
      ignored: Math.max(0, totalAlerts - acknowledgedCount - dismissedCount - resolvedCount)
    }
  };
}

function extractSpamIndicators(feedback) {
  const indicators = [];
  
  if (feedback.toLowerCase().includes('too frequent')) {
    indicators.push('high_frequency');
  }
  
  if (feedback.toLowerCase().includes('not relevant')) {
    indicators.push('low_relevance');
  }
  
  if (feedback.toLowerCase().includes('duplicate')) {
    indicators.push('duplication');
  }
  
  if (feedback.toLowerCase().includes('false alarm')) {
    indicators.push('false_positive');
  }
  
  return indicators;
}

function calculateSnoozeDuration(snoozeUntil) {
  const now = new Date();
  const snoozeDate = new Date(snoozeUntil);
  const durationMs = snoozeDate - now;
  
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}