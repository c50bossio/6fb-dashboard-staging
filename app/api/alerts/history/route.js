import { NextResponse } from 'next/server';
export const runtime = 'edge'

/**
 * GET /api/alerts/history
 * Get alert history with analytics and insights
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const barbershopId = searchParams.get('barbershop_id');
    const userId = searchParams.get('user_id');
    const days = parseInt(searchParams.get('days') || '7');
    const limit = parseInt(searchParams.get('limit') || '100');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    const includeAnalytics = searchParams.get('include_analytics') !== 'false';
    
    if (!barbershopId || !userId) {
      return NextResponse.json(
        { error: 'barbershop_id and user_id are required parameters' },
        { status: 400 }
      );
    }
    
    const historyResponse = await fetch('http://localhost:8001/intelligent-alerts/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barbershop_id: barbershopId,
        user_id: userId,
        days: days,
        limit: limit,
        filters: {
          category: category,
          priority: priority,
          status: status
        },
        include_analytics: includeAnalytics
      }),
    });
    
    if (!historyResponse.ok) {
      throw new Error(`Python service error: ${historyResponse.statusText}`);
    }
    
    const historyData = await historyResponse.json();
    
    const enrichedData = {
      ...historyData,
      client_side_analytics: generateClientSideAnalytics(historyData.alerts || []),
      trend_analysis: generateTrendAnalysis(historyData.alerts || []),
      performance_metrics: calculatePerformanceMetrics(historyData),
      recommendations: generateHistoryRecommendations(historyData)
    };
    
    return NextResponse.json({
      success: true,
      data: {
        barbershop_id: barbershopId,
        user_id: userId,
        query_parameters: {
          days,
          limit,
          category,
          priority,
          status,
          include_analytics: includeAnalytics
        },
        ...enrichedData,
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error getting alert history:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get alert history',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts/history
 * Export alert history or perform bulk operations
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    const { 
      barbershop_id, 
      user_id, 
      action,
      export_format = 'json',
      date_range,
      filters = {},
      bulk_operation
    } = body;
    
    if (!barbershop_id || !user_id || !action) {
      return NextResponse.json(
        { error: 'barbershop_id, user_id, and action are required' },
        { status: 400 }
      );
    }
    
    let result;
    
    switch (action) {
      case 'export':
        result = await handleExport(barbershop_id, user_id, export_format, date_range, filters);
        break;
        
      case 'bulk_acknowledge':
        result = await handleBulkAcknowledge(barbershop_id, user_id, bulk_operation);
        break;
        
      case 'bulk_dismiss':
        result = await handleBulkDismiss(barbershop_id, user_id, bulk_operation);
        break;
        
      case 'generate_report':
        result = await handleGenerateReport(barbershop_id, user_id, date_range, filters);
        break;
        
      case 'analyze_patterns':
        result = await handleAnalyzePatterns(barbershop_id, user_id, date_range);
        break;
        
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        barbershop_id,
        user_id,
        action,
        result,
        processed_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error processing alert history action:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process alert history action',
        details: error.message 
      },
      { status: 500 }
    );
  }
}


async function handleExport(barbershopId, userId, format, dateRange, filters) {
  const exportResponse = await fetch('http://localhost:8001/intelligent-alerts/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      barbershop_id: barbershopId,
      user_id: userId,
      export_format: format,
      date_range: dateRange,
      filters: filters,
      timestamp: new Date().toISOString()
    }),
  });
  
  if (!exportResponse.ok) {
    throw new Error(`Export failed: ${exportResponse.statusText}`);
  }
  
  const exportData = await exportResponse.json();
  
  return {
    export_id: generateExportId(),
    format: format,
    file_url: exportData.file_url || null,
    download_url: exportData.download_url || null,
    record_count: exportData.record_count || 0,
    file_size: exportData.file_size || 0,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    ...exportData
  };
}

async function handleBulkAcknowledge(barbershopId, userId, bulkOperation) {
  const { alert_ids, criteria } = bulkOperation;
  
  if (!alert_ids && !criteria) {
    throw new Error('Either alert_ids or selection criteria must be provided');
  }
  
  const bulkResponse = await fetch('http://localhost:8001/intelligent-alerts/bulk-acknowledge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      barbershop_id: barbershopId,
      user_id: userId,
      alert_ids: alert_ids,
      criteria: criteria,
      bulk_notes: bulkOperation.notes || 'Bulk acknowledged via API',
      timestamp: new Date().toISOString()
    }),
  });
  
  if (!bulkResponse.ok) {
    throw new Error(`Bulk acknowledge failed: ${bulkResponse.statusText}`);
  }
  
  const result = await bulkResponse.json();
  
  return {
    operation: 'bulk_acknowledge',
    processed_count: result.processed_count || 0,
    success_count: result.success_count || 0,
    failed_count: result.failed_count || 0,
    errors: result.errors || [],
    ...result
  };
}

async function handleBulkDismiss(barbershopId, userId, bulkOperation) {
  const { alert_ids, criteria, reason } = bulkOperation;
  
  if (!alert_ids && !criteria) {
    throw new Error('Either alert_ids or selection criteria must be provided');
  }
  
  const bulkResponse = await fetch('http://localhost:8001/intelligent-alerts/bulk-dismiss', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      barbershop_id: barbershopId,
      user_id: userId,
      alert_ids: alert_ids,
      criteria: criteria,
      dismiss_reason: reason || 'Bulk dismissed via API',
      timestamp: new Date().toISOString()
    }),
  });
  
  if (!bulkResponse.ok) {
    throw new Error(`Bulk dismiss failed: ${bulkResponse.statusText}`);
  }
  
  const result = await bulkResponse.json();
  
  return {
    operation: 'bulk_dismiss',
    processed_count: result.processed_count || 0,
    success_count: result.success_count || 0,
    failed_count: result.failed_count || 0,
    ml_learning_applied: result.ml_learning_applied || false,
    ...result
  };
}

async function handleGenerateReport(barbershopId, userId, dateRange, filters) {
  const reportResponse = await fetch('http://localhost:8001/intelligent-alerts/generate-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      barbershop_id: barbershopId,
      user_id: userId,
      date_range: dateRange,
      filters: filters,
      report_type: 'comprehensive',
      timestamp: new Date().toISOString()
    }),
  });
  
  if (!reportResponse.ok) {
    throw new Error(`Report generation failed: ${reportResponse.statusText}`);
  }
  
  const reportData = await reportResponse.json();
  
  return {
    report_id: generateReportId(),
    report_type: 'comprehensive',
    date_range: dateRange,
    total_alerts: reportData.total_alerts || 0,
    report_url: reportData.report_url || null,
    sections: reportData.sections || [],
    insights: reportData.insights || [],
    generated_at: new Date().toISOString(),
    ...reportData
  };
}

async function handleAnalyzePatterns(barbershopId, userId, dateRange) {
  const analysisResponse = await fetch('http://localhost:8001/intelligent-alerts/analyze-patterns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      barbershop_id: barbershopId,
      user_id: userId,
      date_range: dateRange,
      analysis_type: 'comprehensive',
      timestamp: new Date().toISOString()
    }),
  });
  
  if (!analysisResponse.ok) {
    throw new Error(`Pattern analysis failed: ${analysisResponse.statusText}`);
  }
  
  const analysisData = await analysisResponse.json();
  
  return {
    analysis_id: generateAnalysisId(),
    patterns_found: analysisData.patterns_found || 0,
    pattern_types: analysisData.pattern_types || [],
    recurring_issues: analysisData.recurring_issues || [],
    trend_analysis: analysisData.trend_analysis || {},
    recommendations: analysisData.recommendations || [],
    confidence_score: analysisData.confidence_score || 0,
    ...analysisData
  };
}


function generateClientSideAnalytics(alerts) {
  if (!alerts || alerts.length === 0) {
    return {
      total_alerts: 0,
      by_hour: {},
      by_day_of_week: {},
      by_category: {},
      by_priority: {},
      response_time_analysis: {}
    };
  }
  
  const analytics = {
    total_alerts: alerts.length,
    by_hour: {},
    by_day_of_week: {},
    by_category: {},
    by_priority: {},
    response_time_analysis: {
      average_response_time: 0,
      total_interactions: 0
    }
  };
  
  let totalResponseTime = 0;
  let responseTimeCount = 0;
  
  alerts.forEach(alert => {
    if (alert.created_at) {
      const hour = new Date(alert.created_at).getHours();
      analytics.by_hour[hour] = (analytics.by_hour[hour] || 0) + 1;
      
      const dayOfWeek = new Date(alert.created_at).getDay();
      analytics.by_day_of_week[dayOfWeek] = (analytics.by_day_of_week[dayOfWeek] || 0) + 1;
    }
    
    if (alert.category) {
      analytics.by_category[alert.category] = (analytics.by_category[alert.category] || 0) + 1;
    }
    
    if (alert.priority) {
      analytics.by_priority[alert.priority] = (analytics.by_priority[alert.priority] || 0) + 1;
    }
    
    if (alert.user_interactions && Array.isArray(alert.user_interactions)) {
      alert.user_interactions.forEach(interaction => {
        if (interaction.response_time && interaction.response_time > 0) {
          totalResponseTime += interaction.response_time;
          responseTimeCount++;
        }
      });
    }
  });
  
  if (responseTimeCount > 0) {
    analytics.response_time_analysis.average_response_time = totalResponseTime / responseTimeCount;
    analytics.response_time_analysis.total_interactions = responseTimeCount;
  }
  
  return analytics;
}

function generateTrendAnalysis(alerts) {
  if (!alerts || alerts.length < 2) {
    return {
      trend_direction: 'insufficient_data',
      trend_strength: 0,
      weekly_comparison: {},
      category_trends: {}
    };
  }
  
  const sortedAlerts = [...alerts].sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  );
  
  const weeklyBuckets = {};
  const categoryTrends = {};
  
  sortedAlerts.forEach(alert => {
    const date = new Date(alert.created_at);
    const weekKey = getWeekKey(date);
    
    weeklyBuckets[weekKey] = (weeklyBuckets[weekKey] || 0) + 1;
    
    if (alert.category) {
      if (!categoryTrends[alert.category]) {
        categoryTrends[alert.category] = {};
      }
      categoryTrends[alert.category][weekKey] = (categoryTrends[alert.category][weekKey] || 0) + 1;
    }
  });
  
  const weeks = Object.keys(weeklyBuckets).sort();
  if (weeks.length < 2) {
    return {
      trend_direction: 'insufficient_data',
      trend_strength: 0,
      weekly_comparison: weeklyBuckets,
      category_trends: categoryTrends
    };
  }
  
  const firstWeek = weeklyBuckets[weeks[0]];
  const lastWeek = weeklyBuckets[weeks[weeks.length - 1]];
  const trendDirection = lastWeek > firstWeek ? 'increasing' : 
                        lastWeek < firstWeek ? 'decreasing' : 'stable';
  
  const trendStrength = Math.abs(lastWeek - firstWeek) / Math.max(firstWeek, lastWeek);
  
  return {
    trend_direction: trendDirection,
    trend_strength: trendStrength,
    weekly_comparison: weeklyBuckets,
    category_trends: categoryTrends,
    total_weeks_analyzed: weeks.length
  };
}

function calculatePerformanceMetrics(historyData) {
  const alerts = historyData.alerts || [];
  const interactionStats = historyData.interaction_statistics || {};
  
  if (alerts.length === 0) {
    return {
      alert_effectiveness: 0,
      user_engagement: 0,
      system_performance: 0,
      overall_score: 0
    };
  }
  
  const resolvedCount = alerts.filter(alert => alert.status === 'resolved').length;
  const alertEffectiveness = resolvedCount / alerts.length;
  
  const interactedCount = alerts.filter(alert => 
    alert.user_interactions && alert.user_interactions.length > 0
  ).length;
  const userEngagement = interactedCount / alerts.length;
  
  const avgConfidence = alerts.reduce((sum, alert) => 
    sum + (alert.confidence_score || 0), 0) / alerts.length;
  
  const avgResponseTime = Object.values(interactionStats).reduce((sum, stat) => 
    sum + (stat.avg_response_time || 0), 0) / Math.max(Object.keys(interactionStats).length, 1);
  
  const responseTimeScore = Math.max(0, 1 - (avgResponseTime / 300));
  
  const systemPerformance = (avgConfidence + responseTimeScore) / 2;
  
  const overallScore = (alertEffectiveness * 0.4 + userEngagement * 0.3 + systemPerformance * 0.3);
  
  return {
    alert_effectiveness: alertEffectiveness,
    user_engagement: userEngagement,
    system_performance: systemPerformance,
    overall_score: overallScore,
    metrics: {
      total_alerts: alerts.length,
      resolved_alerts: resolvedCount,
      average_confidence: avgConfidence,
      average_response_time: avgResponseTime,
      interaction_rate: userEngagement
    }
  };
}

function generateHistoryRecommendations(historyData) {
  const recommendations = [];
  const alerts = historyData.alerts || [];
  const performanceMetrics = calculatePerformanceMetrics(historyData);
  
  if (performanceMetrics.alert_effectiveness < 0.5) {
    recommendations.push({
      type: 'alert_quality',
      priority: 'high',
      title: 'Improve Alert Relevance',
      description: 'Low resolution rate suggests alerts may not be actionable enough',
      actions: [
        'Review alert rules and thresholds',
        'Implement better prioritization',
        'Add more contextual information to alerts'
      ]
    });
  }
  
  if (performanceMetrics.user_engagement < 0.3) {
    recommendations.push({
      type: 'engagement',
      priority: 'medium',
      title: 'Increase User Engagement',
      description: 'Users are not interacting with many alerts',
      actions: [
        'Reduce alert frequency',
        'Improve alert presentation',
        'Add training on alert system usage'
      ]
    });
  }
  
  const categoryStats = generateClientSideAnalytics(alerts).by_category;
  const topCategory = Object.entries(categoryStats).reduce((a, b) => 
    categoryStats[a[0]] > categoryStats[b[0]] ? a : b, ['', 0]
  );
  
  if (topCategory[1] > alerts.length * 0.5) {
    recommendations.push({
      type: 'category_focus',
      priority: 'medium',
      title: `High ${topCategory[0]} Alert Volume`,
      description: `${topCategory[0]} alerts make up ${Math.round(topCategory[1]/alerts.length*100)}% of all alerts`,
      actions: [
        `Review ${topCategory[0]} alert rules`,
        'Consider adjusting thresholds',
        'Implement preventive measures'
      ]
    });
  }
  
  return recommendations;
}


function generateExportId() {
  return `export_${Date.now()}_${process.hrtime.bigint().toString(36)}`;
}

function generateReportId() {
  return `report_${Date.now()}_${process.hrtime.bigint().toString(36)}`;
}

function generateAnalysisId() {
  return `analysis_${Date.now()}_${process.hrtime.bigint().toString(36)}`;
}

function getWeekKey(date) {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}