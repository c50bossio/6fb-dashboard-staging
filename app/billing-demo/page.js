'use client'

import { useState, useEffect } from 'react'

export default function BillingDemoPage() {
  const [testResults, setTestResults] = useState({
    accounts: { status: '⏳', data: null },
    history: { status: '⏳', data: null },
    payments: { status: '⏳', data: null }
  })
  
  const [campaignForm, setCampaignForm] = useState({
    type: 'email',
    recipients: 150
  })
  
  const [aiQuery, setAiQuery] = useState('How is my marketing campaign performing this month?')
  
  const DEMO_USER_ID = 'demo-user-001'
  const DEMO_ACCOUNT_ID = 'billing-demo-demo-user-001'

  const testBillingAccounts = async () => {
    setTestResults(prev => ({ ...prev, accounts: { status: '⏳', data: 'Testing billing accounts API...' }}))
    
    try {
      const response = await fetch(`/api/marketing/billing?user_id=${DEMO_USER_ID}`)
      const data = await response.json()
      
      if (data.success) {
        setTestResults(prev => ({ 
          ...prev, 
          accounts: { status: '✅', data: JSON.stringify(data, null, 2) }
        }))
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        accounts: { status: '❌', data: `Error: ${error.message}` }
      }))
    }
  }

  const testBillingHistory = async () => {
    setTestResults(prev => ({ ...prev, history: { status: '⏳', data: 'Testing billing history API...' }}))
    
    try {
      const response = await fetch(`/api/marketing/billing/history?user_id=${DEMO_USER_ID}&limit=5`)
      const data = await response.json()
      
      if (data.success) {
        setTestResults(prev => ({ 
          ...prev, 
          history: { status: '✅', data: JSON.stringify(data, null, 2) }
        }))
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        history: { status: '❌', data: `Error: ${error.message}` }
      }))
    }
  }

  const testPaymentMethods = async () => {
    setTestResults(prev => ({ ...prev, payments: { status: '⏳', data: 'Testing payment methods API...' }}))
    
    try {
      const response = await fetch(`/api/marketing/billing/payment-methods?account_id=${DEMO_ACCOUNT_ID}`)
      const data = await response.json()
      
      if (data.success) {
        setTestResults(prev => ({ 
          ...prev, 
          payments: { status: '✅', data: JSON.stringify(data, null, 2) }
        }))
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        payments: { status: '❌', data: `Error: ${error.message}` }
      }))
    }
  }

  const runAllTests = async () => {
    console.log('🚀 Running complete end-to-end test suite...')
    
    await testBillingAccounts()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testBillingHistory()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testPaymentMethods()
    
    console.log('✅ Complete test suite finished!')
  }

  // Auto-run tests on component mount
  useEffect(() => {
    const runInitialTests = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await runAllTests()
    }
    runInitialTests()
  }, [])

  const simulateCampaignBilling = () => {
    const costPerRecipient = campaignForm.type === 'email' ? 0.02 : 0.08
    const platformFeeRate = 0.15
    const servicesCost = campaignForm.recipients * costPerRecipient
    const platformFee = servicesCost * platformFeeRate
    const totalCost = servicesCost + platformFee
    
    const simulatedBilling = {
      campaign_id: `campaign-${Date.now()}`,
      campaign_name: `${campaignForm.type.toUpperCase()} Campaign - ${new Date().toLocaleDateString()}`,
      campaign_type: campaignForm.type,
      recipients_count: campaignForm.recipients,
      services_cost: Math.round(servicesCost * 100) / 100,
      platform_fee: Math.round(platformFee * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      estimated_delivery_rate: campaignForm.type === 'email' ? '95%' : '98%',
      billing_status: 'calculated',
      timestamp: new Date().toISOString()
    }
    
    return simulatedBilling
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Marketing Billing System Demo</h1>
          <p className="text-lg text-gray-600">Comprehensive End-to-End Testing of Marketing Billing APIs</p>
          <div className="mt-4 text-sm text-gray-500">
            Testing with demo user: <code className="bg-yellow-100 px-2 py-1 rounded">{DEMO_USER_ID}</code>
          </div>
        </div>

        {/* Test Results Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 Test Results Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">{testResults.accounts.status}</div>
              <div className="text-sm text-gray-600">Billing Accounts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">{testResults.history.status}</div>
              <div className="text-sm text-gray-600">Billing History</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">{testResults.payments.status}</div>
              <div className="text-sm text-gray-600">Payment Methods</div>
            </div>
          </div>
        </div>

        {/* Billing Accounts Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">💳 Billing Accounts</h2>
          <button 
            onClick={testBillingAccounts} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-4"
          >
            🔄 Test Billing Accounts API
          </button>
          <div className="bg-gray-100 p-4 rounded font-mono text-sm whitespace-pre-wrap overflow-x-auto">
            {testResults.accounts.data || 'Click the button to test billing accounts...'}
          </div>
        </div>

        {/* Billing History Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📈 Billing History</h2>
          <button 
            onClick={testBillingHistory} 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mb-4"
          >
            🔄 Test Billing History API
          </button>
          <div className="bg-gray-100 p-4 rounded font-mono text-sm whitespace-pre-wrap overflow-x-auto">
            {testResults.history.data || 'Click the button to test billing history...'}
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">💰 Payment Methods</h2>
          <button 
            onClick={testPaymentMethods} 
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded mb-4"
          >
            🔄 Test Payment Methods API
          </button>
          <div className="bg-gray-100 p-4 rounded font-mono text-sm whitespace-pre-wrap overflow-x-auto">
            {testResults.payments.data || 'Click the button to test payment methods...'}
          </div>
        </div>

        {/* Campaign Creation Simulation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🎯 Campaign Creation & Billing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Type</label>
              <select 
                value={campaignForm.type}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="email">📧 Email Campaign</option>
                <option value="sms">📱 SMS Campaign</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipients Count</label>
              <input 
                type="number" 
                value={campaignForm.recipients}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, recipients: parseInt(e.target.value) }))}
                min="1" 
                max="1000" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <button 
            onClick={() => {
              const billing = simulateCampaignBilling()
              alert(`Campaign Billing Calculated:\n\nTotal Cost: $${billing.total_cost}\nRecipients: ${billing.recipients_count}\nType: ${billing.campaign_type}\n\nSee console for full details.`)
              console.log('Campaign Billing Simulation:', billing)
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded mb-4"
          >
            🚀 Simulate Campaign Billing
          </button>
        </div>

        {/* AI Chat Billing Integration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🤖 AI Chat Billing Integration</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Test AI Query</label>
            <input 
              type="text" 
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button 
            onClick={async () => {
              try {
                const response = await fetch(`/api/ai/analytics/usage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'track_conversation',
                    data: {
                      agent: 'FloatingChat',
                      topic: 'marketing',
                      userId: DEMO_USER_ID,
                      sessionId: `demo-session-${Date.now()}`,
                      query: aiQuery
                    }
                  })
                })
                const result = await response.json()
                alert('✅ AI Chat billing integration test completed! Check browser console for details.')
                console.log('AI Chat Billing Test Result:', result)
              } catch (error) {
                alert(`❌ AI Chat billing test failed: ${error.message}`)
                console.error('AI Chat Billing Error:', error)
              }
            }}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded mb-4"
          >
            🤖 Test AI Chat with Billing
          </button>
        </div>

        {/* Run All Tests */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <button 
            onClick={runAllTests}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold text-lg"
          >
            🚀 Run Complete End-to-End Test Suite
          </button>
        </div>
      </div>
    </div>
  )
}