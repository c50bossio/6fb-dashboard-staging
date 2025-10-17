import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { apiKey, accountId } = await request.json()
    
    if (!apiKey || !accountId) {
      return NextResponse.json({
        error: 'Missing credentials',
        message: 'API key and Account ID required for version detection'
      }, { status: 400 })
    }
    
    
    try {
      const v2Response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/products?limit=1', {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json'
        }
      })
      
      if (v2Response.ok) {
        const v2Data = await v2Response.json()
        return NextResponse.json({
          version: 'v2',
          compatible: true,
          message: 'API v2 is working correctly',
          sampleData: v2Data?.ProductList?.slice(0, 2) || [],
          headers: {
            'api-auth-accountid': accountId,
            'api-auth-applicationkey': '[HIDDEN]'
          }
        })
      }
      
    } catch (v2Error) {
    }
    
    try {
      const credentials = Buffer.from(`${accountId}:${apiKey}`).toString('base64')
      
      const v1Response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v1/products?limit=1', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (v1Response.ok) {
        const v1Data = await v1Response.json()
        return NextResponse.json({
          version: 'v1',
          compatible: true,
          message: 'API v1 is working correctly',
          sampleData: v1Data?.Products?.slice(0, 2) || [],
          headers: {
            'Authorization': 'Basic [CREDENTIALS_HIDDEN]'
          }
        })
      }
      
    } catch (v1Error) {
    }
    
    return NextResponse.json({
      version: 'unknown',
      compatible: false,
      message: 'Neither v1 nor v2 API worked with provided credentials',
      suggestions: [
        'Verify your Account ID and API key are correct',
        'Check if your Cin7 account has API access enabled',
        'Ensure your API key has product read permissions'
      ]
    }, { status: 400 })
    
  } catch (error) {
    console.error('Version check error:', error)
    return NextResponse.json({
      error: 'Version check failed',
      message: error.message
    }, { status: 500 })
  }
}