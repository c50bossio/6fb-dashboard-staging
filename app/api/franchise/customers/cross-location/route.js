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
    
    const crossLocationCheck = await authService.check_cross_location_permission(
      userSession,
      'VIEW_ALL_LOCATIONS'
    )
    
    if (!crossLocationCheck.allowed) {
      const regularPermissionCheck = await authService.check_permission(
        userSession,
        'customers',
        'read_franchise',
        null,
        userSession.primary_franchise_id
      )
      
      if (!regularPermissionCheck.allowed) {
        return NextResponse.json(
          { error: 'Insufficient permissions to view cross-location customers' },
          { status: 403 }
        )
      }
    }
    
    const franchiseId = userSession.primary_franchise_id
    
    const customersResult = await franchiseService.get_cross_location_customers(franchiseId)
    
    if (!customersResult.success) {
      return NextResponse.json(
        { error: customersResult.error },
        { status: 404 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const searchTerm = searchParams.get('search')
    
    let customers = customersResult.data
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      customers = customers.filter(customer => 
        customer.name.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.customer_code.toLowerCase().includes(searchLower)
      )
    }
    
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedCustomers = customers.slice(startIndex, endIndex)
    
    const totalCustomers = customers.length
    const totalLifetimeValue = customers.reduce((sum, customer) => sum + (customer.lifetime_value || 0), 0)
    const avgLocationsPerCustomer = customers.length > 0 
      ? customers.reduce((sum, customer) => sum + (customer.locations_visited || 0), 0) / customers.length 
      : 0
    
    return NextResponse.json({
      customers: paginatedCustomers,
      pagination: {
        page,
        limit,
        total: totalCustomers,
        totalPages: Math.ceil(totalCustomers / limit),
        hasMore: endIndex < totalCustomers
      },
      summary: {
        total_customers: totalCustomers,
        total_lifetime_value: totalLifetimeValue,
        average_locations_per_customer: parseFloat(avgLocationsPerCustomer.toFixed(1)),
        search_term: searchTerm
      }
    })
    
  } catch (error) {
    console.error('Cross-location customers API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}