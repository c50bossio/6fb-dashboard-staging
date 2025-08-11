#!/usr/bin/env node

/**
 * Test Predictive Analytics API with real database data
 */

const fetch = require('node-fetch')

const BASE_URL = 'http://localhost:9999'

async function testPredictiveAnalytics() {
  console.log('\n🔮 Testing Predictive Analytics Dashboard\n')
  console.log('=' . repeat(50))
  
  try {
    // 1. Test GET endpoint (dashboard view)
    console.log('\n📊 Testing GET /api/ai/predictive-analytics:')
    const getResponse = await fetch(`${BASE_URL}/api/ai/predictive-analytics?barbershop_id=demo`)
    const getData = await getResponse.json()
    
    if (getData.success && getData.dashboard) {
      console.log('✅ Dashboard data retrieved successfully')
      console.log(`  Predictions: ${getData.dashboard.overview.active_predictions}`)
      console.log(`  30-day forecast: ${getData.dashboard.overview.revenue_forecast_next_30_days}`)
      console.log(`  Confidence: ${getData.dashboard.overview.confidence_level}`)
      
      if (getData.dashboard.data_quality) {
        console.log(`  Data quality: ${getData.dashboard.data_quality.historical_days} days of history`)
        console.log(`  Completeness: ${getData.dashboard.data_quality.data_completeness}`)
      }
      
      if (getData.predictions) {
        console.log('\n📈 Revenue Predictions:')
        const predictions = getData.predictions.revenueForecast.predictions
        console.log(`  1 Day: $${predictions['1_day'].value} (${Math.round(predictions['1_day'].confidence * 100)}% confidence)`)
        console.log(`  1 Week: $${predictions['1_week'].value} (${Math.round(predictions['1_week'].confidence * 100)}% confidence)`)
        console.log(`  1 Month: $${predictions['1_month'].value} (${Math.round(predictions['1_month'].confidence * 100)}% confidence)`)
      }
    } else {
      console.log('❌ Failed to retrieve dashboard data')
      if (getData.error) console.log(`  Error: ${getData.error}`)
    }
    
    // 2. Test POST endpoint (revenue forecast)
    console.log('\n💰 Testing POST revenue forecast:')
    const postResponse = await fetch(`${BASE_URL}/api/ai/predictive-analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prediction_type: 'revenue_forecast',
        barbershop_id: 'demo',
        parameters: {
          timeframe: 7,
          confidence_level: 0.85
        }
      })
    })
    
    const postData = await postResponse.json()
    
    if (postData.success && postData.forecast) {
      console.log('✅ Revenue forecast generated successfully')
      console.log(`  Timeframe: ${postData.forecast.timeframe_days} days`)
      console.log(`  Conservative: $${postData.forecast.scenarios.conservative.total_revenue}`)
      console.log(`  Realistic: $${postData.forecast.scenarios.realistic.total_revenue}`)
      console.log(`  Optimistic: $${postData.forecast.scenarios.optimistic.total_revenue}`)
      console.log(`  Model confidence: ${postData.forecast.accuracy_metrics.model_confidence}`)
    } else {
      console.log('❌ Failed to generate revenue forecast')
      if (postData.error) console.log(`  Error: ${postData.error}`)
    }
    
    // 3. Test customer behavior prediction
    console.log('\n👥 Testing customer behavior prediction:')
    const behaviorResponse = await fetch(`${BASE_URL}/api/ai/predictive-analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prediction_type: 'customer_behavior',
        barbershop_id: 'demo',
        parameters: {}
      })
    })
    
    const behaviorData = await behaviorResponse.json()
    
    if (behaviorData.success && behaviorData.behavior_analysis) {
      console.log('✅ Customer behavior analysis complete')
      const segments = behaviorData.behavior_analysis.customer_segments
      Object.entries(segments).forEach(([key, segment]) => {
        console.log(`  ${key}: ${segment.percentage}% of customers`)
      })
    } else {
      console.log('❌ Failed to analyze customer behavior')
    }
    
    // Summary
    console.log('\n' + '=' . repeat(50))
    console.log('📝 Summary:')
    
    if (getData.dashboard?.data_quality?.historical_days > 0) {
      console.log('✅ Predictive Analytics is using REAL database data')
      console.log(`   Based on ${getData.dashboard.data_quality.historical_days} days of historical data`)
    } else {
      console.log('⚠️ Limited historical data available')
      console.log('   Predictions will improve as more data is collected')
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message)
    console.log('\nMake sure the development server is running:')
    console.log('  npm run dev')
  }
}

// Helper to repeat string
String.prototype.repeat = function(count) {
  return new Array(count + 1).join(this)
}

testPredictiveAnalytics().catch(console.error)