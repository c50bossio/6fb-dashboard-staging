import { NextResponse } from 'next/server'

async function testCin7Connection(accountId, apiKey) {
  try {
    console.log('Testing Cin7 connection with account:', accountId)
    
    const endpointVariations = [
      'https://inventory.dearsystems.com/ExternalAPI/v2/me',
      'https://inventory.dearsystems.com/externalapi/v2/me', 
      'https://inventory.dearsystems.com/ExternalApi/v2/me',
      'https://inventory.dearsystems.com/ExternalAPI/me'
    ]
    
    for (const endpoint of endpointVariations) {
      console.log(`Trying endpoint: ${endpoint}`)
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json'
        }
      })

      console.log(`Response status for ${endpoint}:`, response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Cin7 connection successful with endpoint:', endpoint)
        console.log('Response data:', data?.Name || 'Connected')
        return { success: true, data, endpoint }
      } else if (response.status === 401) {
        console.log(`401 Unauthorized for ${endpoint} - likely invalid credentials`)
        continue // Try next endpoint in case URL is wrong
      } else if (response.status === 404) {
        console.log(`404 Not Found for ${endpoint} - trying next endpoint`)
        continue // Try next endpoint
      } else {
        const errorText = await response.text()
        console.error(`Error ${response.status} for ${endpoint}:`, errorText)
        continue // Try next endpoint
      }
    }
    
    return { success: false, error: 'Unable to connect with any known API endpoint. Please verify your credentials and API access.' }
  } catch (error) {
    console.error('Cin7 connection test failed:', error)
    return { success: false, error: error.message }
  }
}

export async function POST(request) {
  try {
    const { accountId, apiKey } = await request.json()

    if (!accountId || !apiKey) {
      return NextResponse.json(
        { error: 'Account ID and API key are required' },
        { status: 400 }
      )
    }

    console.log('Testing Cin7 connection...')
    const connectionTest = await testCin7Connection(accountId, apiKey)
    
    if (!connectionTest.success) {
      return NextResponse.json(
        { error: connectionTest.error },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      status: 'connected',
      message: 'Successfully connected to Cin7',
      accountName: connectionTest.data?.Name || 'Connected Account'
    })

  } catch (error) {
    console.error('Connection error:', error)
    return NextResponse.json(
      { error: 'Connection failed: ' + error.message },
      { status: 500 }
    )
  }
}
