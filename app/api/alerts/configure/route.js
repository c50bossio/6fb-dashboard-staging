import { NextResponse } from 'next/server';
export const runtime = 'edge'

/**
 * GET /api/alerts/configure
 * Get alert configuration and user preferences
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const barbershopId = searchParams.get('barbershop_id');
    const userId = searchParams.get('user_id');
    
    // Validate required parameters
    if (!barbershopId || !userId) {
      return NextResponse.json(
        { error: 'barbershop_id and user_id are required parameters' },
        { status: 400 }
      );
    }
    
    // Get user alert preferences
    const preferencesResponse = await fetch('http://localhost:8001/intelligent-alerts/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        barbershop_id: barbershopId,
        action: 'get'
      }),
    });
    
    const preferences = preferencesResponse.ok ? await preferencesResponse.json() : getDefaultPreferences();
    
    // Get alert rules configuration
    const rulesResponse = await fetch('http://localhost:8001/intelligent-alerts/rules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barbershop_id: barbershopId,
        action: 'list'
      }),
    });
    
    const rules = rulesResponse.ok ? await rulesResponse.json() : [];
    
    // Get system configuration
    const systemConfig = {
      available_categories: [
        { id: 'business_metric', name: 'Business Metrics', description: 'Revenue, bookings, and KPIs' },
        { id: 'system_health', name: 'System Health', description: 'Technical issues and downtime' },
        { id: 'customer_behavior', name: 'Customer Behavior', description: 'Booking patterns and satisfaction' },
        { id: 'revenue_anomaly', name: 'Revenue Anomalies', description: 'Unusual revenue patterns' },
        { id: 'operational_issue', name: 'Operational Issues', description: 'Staff and service problems' },
        { id: 'opportunity', name: 'Business Opportunities', description: 'Growth and optimization chances' },
        { id: 'compliance', name: 'Compliance', description: 'Regulatory and policy alerts' },
        { id: 'security', name: 'Security', description: 'Security threats and breaches' }
      ],
      priority_levels: [
        { id: 'critical', name: 'Critical', description: 'Immediate action required', color: '#dc2626' },
        { id: 'high', name: 'High', description: 'Action required soon', color: '#ea580c' },
        { id: 'medium', name: 'Medium', description: 'Moderate importance', color: '#d97706' },
        { id: 'low', name: 'Low', description: 'Informational', color: '#65a30d' },
        { id: 'info', name: 'Info', description: 'General information', color: '#0284c7' }
      ],
      notification_channels: [
        { id: 'email', name: 'Email', description: 'Email notifications' },
        { id: 'sms', name: 'SMS', description: 'Text message alerts' },
        { id: 'push', name: 'Push', description: 'Browser push notifications' },
        { id: 'dashboard', name: 'Dashboard', description: 'In-app notifications' }
      ],
      ml_features: {
        adaptive_learning: true,
        smart_grouping: true,
        fatigue_prevention: true,
        predictive_prioritization: true
      }
    };
    
    return NextResponse.json({
      success: true,
      data: {
        barbershop_id: barbershopId,
        user_id: userId,
        user_preferences: preferences,
        alert_rules: rules,
        system_configuration: systemConfig,
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error getting alert configuration:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get alert configuration',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts/configure
 * Update alert configuration and user preferences
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    const { 
      barbershop_id, 
      user_id, 
      preferences, 
      rules,
      action = 'update_preferences'
    } = body;
    
    // Validate required fields
    if (!barbershop_id || !user_id) {
      return NextResponse.json(
        { error: 'barbershop_id and user_id are required' },
        { status: 400 }
      );
    }
    
    const response = { updates: [] };
    
    // Update user preferences
    if (action === 'update_preferences' && preferences) {
      const preferencesResponse = await fetch('http://localhost:8001/intelligent-alerts/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id,
          barbershop_id,
          action: 'update',
          preferences: {
            ...preferences,
            updated_at: new Date().toISOString()
          }
        }),
      });
      
      if (preferencesResponse.ok) {
        const updatedPrefs = await preferencesResponse.json();
        response.updates.push({
          type: 'preferences',
          success: true,
          data: updatedPrefs
        });
      } else {
        response.updates.push({
          type: 'preferences',
          success: false,
          error: 'Failed to update preferences'
        });
      }
    }
    
    // Update alert rules
    if (action === 'update_rules' && rules) {
      const rulesResponse = await fetch('http://localhost:8001/intelligent-alerts/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershop_id,
          action: 'update',
          rules: rules.map(rule => ({
            ...rule,
            updated_at: new Date().toISOString()
          }))
        }),
      });
      
      if (rulesResponse.ok) {
        const updatedRules = await rulesResponse.json();
        response.updates.push({
          type: 'rules',
          success: true,
          data: updatedRules
        });
      } else {
        response.updates.push({
          type: 'rules',
          success: false,
          error: 'Failed to update rules'
        });
      }
    }
    
    // Create new alert rule
    if (action === 'create_rule' && body.rule_config) {
      const createRuleResponse = await fetch('http://localhost:8001/intelligent-alerts/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershop_id,
          action: 'create',
          rule: {
            ...body.rule_config,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }),
      });
      
      if (createRuleResponse.ok) {
        const newRule = await createRuleResponse.json();
        response.updates.push({
          type: 'rule_created',
          success: true,
          data: newRule
        });
      } else {
        response.updates.push({
          type: 'rule_created',
          success: false,
          error: 'Failed to create rule'
        });
      }
    }
    
    // Test alert configuration
    if (action === 'test_configuration') {
      const testResponse = await fetch('http://localhost:8001/intelligent-alerts/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershop_id,
          user_id,
          test_type: body.test_type || 'sample_alert'
        }),
      });
      
      if (testResponse.ok) {
        const testResult = await testResponse.json();
        response.updates.push({
          type: 'configuration_test',
          success: true,
          data: testResult
        });
      } else {
        response.updates.push({
          type: 'configuration_test',
          success: false,
          error: 'Configuration test failed'
        });
      }
    }
    
    const allSuccessful = response.updates.every(update => update.success);
    
    return NextResponse.json({
      success: allSuccessful,
      data: {
        barbershop_id,
        user_id,
        action,
        updates: response.updates,
        message: allSuccessful ? 'Configuration updated successfully' : 'Some updates failed',
        updated_at: new Date().toISOString()
      }
    }, { status: allSuccessful ? 200 : 207 }); // 207 Multi-Status for partial success
    
  } catch (error) {
    console.error('Error updating alert configuration:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update alert configuration',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/alerts/configure
 * Bulk update alert configuration
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    
    const { 
      barbershop_id, 
      user_id, 
      configuration 
    } = body;
    
    // Validate required fields
    if (!barbershop_id || !user_id || !configuration) {
      return NextResponse.json(
        { error: 'barbershop_id, user_id, and configuration are required' },
        { status: 400 }
      );
    }
    
    // Bulk update via Python service
    const updateResponse = await fetch('http://localhost:8001/intelligent-alerts/bulk-configure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barbershop_id,
        user_id,
        configuration: {
          ...configuration,
          updated_at: new Date().toISOString()
        }
      }),
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Python service error: ${updateResponse.statusText}`);
    }
    
    const result = await updateResponse.json();
    
    // Trigger ML model retraining if preferences significantly changed
    if (configuration.preferences && 
        (configuration.preferences.learning_preferences || 
         configuration.preferences.category_preferences)) {
      
      try {
        await fetch('http://localhost:8001/intelligent-alerts/retrain-models', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            barbershop_id,
            trigger: 'preference_update'
          }),
        });
      } catch (retrainError) {
        console.error('Model retraining trigger failed:', retrainError);
        // Don't fail the request
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        message: 'Alert configuration updated comprehensively',
        updated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error bulk updating alert configuration:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to bulk update alert configuration',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function for default preferences
function getDefaultPreferences() {
  return {
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    priority_threshold: 'medium',
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    category_preferences: {
      business_metric: true,
      system_health: true,
      customer_behavior: true,
      revenue_anomaly: true,
      operational_issue: true,
      opportunity: false,
      compliance: true,
      security: true
    },
    frequency_limits: {
      business_metric: 10,
      system_health: 5,
      customer_behavior: 8,
      revenue_anomaly: 3,
      operational_issue: 6,
      opportunity: 2,
      compliance: 3,
      security: 2
    },
    learning_preferences: {
      adaptive_learning_enabled: true,
      feedback_learning_weight: 0.3,
      auto_dismiss_spam: true,
      smart_grouping: true
    },
    updated_at: new Date().toISOString()
  };
}