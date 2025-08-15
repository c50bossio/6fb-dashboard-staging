import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    return NextResponse.json({
      error: "Franchise services not implemented in JavaScript yet",
      message: "This endpoint requires Python services to be ported to JavaScript"
    }, { status: 501 })
    
    
    const authorization = request.headers.get('authorization')
    const sessionToken = authorization?.replace('Bearer ', '')
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }
    
    const authResult = await authService.validate_session(sessionToken)
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }
    
    const userSession = authResult.user_session
    
    const permissionCheck = await authService.check_permission(
      userSession,
      'locations',
      'read_franchise',
      null,
      userSession.primary_franchise_id
    )
    
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const franchiseId = userSession.primary_franchise_id
    
    const locationsResult = await franchiseService.get_franchise_locations(franchiseId)
    
    if (!locationsResult.success) {
      return NextResponse.json(
        { error: locationsResult.error },
        { status: 404 }
      )
    }
    
    return NextResponse.json(locationsResult.data)
    
  } catch (error) {
    console.error('Franchise locations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const franchiseService = new FranchiseManagementService()
    const authService = new MultiTenantAuthService()
    
    const authorization = request.headers.get('authorization')
    const sessionToken = authorization?.replace('Bearer ', '')
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }
    
    const authResult = await authService.validate_session(sessionToken)
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }
    
    const userSession = authResult.user_session
    
    const permissionCheck = await authService.check_permission(
      userSession,
      'locations',
      'create',
      null,
      userSession.primary_franchise_id
    )
    
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const locationData = await request.json()
    
    const requiredFields = [
      'location_name',
      'shop_owner_id', 
      'street_address',
      'city',
      'state_province',
      'postal_code'
    ]
    
    for (const field of requiredFields) {
      if (!locationData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    const createResult = await franchiseService.create_location(
      userSession.primary_franchise_id,
      locationData.location_name,
      locationData.shop_owner_id,
      locationData.street_address,
      locationData.city,
      locationData.state_province,
      locationData.postal_code,
      {
        ...locationData,
        display_name: locationData.display_name || locationData.location_name
      }
    )
    
    if (!createResult.success) {
      return NextResponse.json(
        { error: createResult.error },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        message: 'Location created successfully',
        data: createResult.data 
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Create location API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}