import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { accountId, apiKey } = await request.json()
    
    console.log('🔍 Testing Cin7 connection...')
    console.log('📝 Account ID (first 8 chars):', accountId ? accountId.substring(0, 8) + '...' : 'not provided')
    console.log('🔑 API Key (first 8 chars):', apiKey ? apiKey.substring(0, 8) + '...' : 'not provided')
    
    if (!accountId || !apiKey) {
      return NextResponse.json(
        { error: 'Account ID and API Key are required' },
        { status: 400 }
      )
    }
    
    // Log the exact request we're making
    const apiUrl = 'https://inventory.dearsystems.com/externalapi/me'
    console.log('🌐 API URL:', apiUrl)
    console.log('📤 Request headers:', {
      'api-auth-accountid': accountId.substring(0, 8) + '...',
      'api-auth-applicationkey': apiKey.substring(0, 8) + '...',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    })
    
    // Use the exact working URL format from API logs: lowercase /externalapi/
    // Your logs show successful calls to /externalapi/products
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId.trim(), // Trim any whitespace
        'api-auth-applicationkey': apiKey.trim(), // Trim any whitespace
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    
    const responseText = await response.text()
    
    console.log('📥 Response status:', response.status)
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))
    console.log('📥 Response body (first 200 chars):', responseText.substring(0, 200))
    
    if (response.status === 403 && responseText.includes('Incorrect credentials')) {
      console.error('❌ Cin7 authentication failed - incorrect credentials')
      console.error('Full error response:', responseText)
      
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          message: 'CIN7 Core API rejected the credentials. Please verify:\n\n1. ✓ API Key is copied correctly (no extra spaces)\n2. ✓ Account ID matches your CIN7 Core account\n3. ✓ You are logged into CIN7 Core (not Omni)\n4. ✓ API access is enabled in Settings → Integrations & API\n\nYou may need to regenerate the API key in CIN7 Core.',
          details: responseText,
          debug: {
            accountIdLength: accountId.length,
            apiKeyLength: apiKey.length,
            accountIdFormat: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(accountId) ? 'Valid UUID format' : 'Invalid format',
            apiUrl: apiUrl
          }
        },
        { status: 403 }
      )
    }
    
    if (response.status === 403) {
      return NextResponse.json(
        { error: 'Access denied. API access may not be enabled for your account.' },
        { status: 403 }
      )
    }
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `CIN7 API error: ${response.status}` },
        { status: response.status }
      )
    }
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid API response format. Please check your credentials.' },
        { status: 500 }
      )
    }
    
    let userData
    try {
      userData = JSON.parse(responseText)
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON response from CIN7 API' },
        { status: 500 }
      )
    }
    
    // Test products endpoint using the exact working URL from logs
    // Your logs show successful calls to /externalapi/products?limit=1
    const productsResponse = await fetch('https://inventory.dearsystems.com/externalapi/products?limit=1', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    
    let hasProducts = false
    if (productsResponse.ok) {
      const productsData = await productsResponse.json()
      hasProducts = (productsData.ProductList || productsData.Products || []).length > 0
    }
    
    return NextResponse.json({
      success: true,
      company: userData.Company || 'Unknown',
      userName: userData.UserName || 'Unknown',
      hasProducts,
      message: 'Connection successful'
    })
    
  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      { error: 'Failed to test connection: ' + error.message },
      { status: 500 }
    )
  }
}