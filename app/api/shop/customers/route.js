import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit')) || 20
    const offset = parseInt(searchParams.get('offset')) || 0
    
    // Mock customer data for Elite Cuts Barbershop
    const allCustomers = [
      {
        id: 'cust-001',
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@email.com',
        phone: '(415) 555-0123',
        first_visit: '2024-01-15',
        last_visit: '2024-12-08',
        total_visits: 12,
        total_spent: 420.00,
        average_service_value: 35.00,
        preferred_barber: 'Alex Rodriguez',
        loyalty_points: 84,
        marketing_consent: true,
        referral_source: 'Google',
        notes: 'Prefers classic cuts, regular monthly appointments',
        status: 'active'
      },
      {
        id: 'cust-002',
        first_name: 'Michael',
        last_name: 'Johnson',
        email: 'michael.johnson@email.com',
        phone: '(415) 555-0124',
        first_visit: '2024-02-20',
        last_visit: '2024-12-07',
        total_visits: 8,
        total_spent: 320.00,
        average_service_value: 40.00,
        preferred_barber: 'Jamie Chen',
        loyalty_points: 64,
        marketing_consent: true,
        referral_source: 'Facebook',
        notes: 'Likes fade cuts, works downtown',
        status: 'active'
      },
      {
        id: 'cust-003',
        first_name: 'David',
        last_name: 'Wilson',
        email: 'david.wilson@email.com',
        phone: '(415) 555-0125',
        first_visit: '2024-12-08',
        last_visit: '2024-12-08',
        total_visits: 1,
        total_spent: 25.00,
        average_service_value: 25.00,
        preferred_barber: null,
        loyalty_points: 5,
        marketing_consent: false,
        referral_source: 'Walk-in',
        notes: 'New customer, beard trim only',
        status: 'new'
      },
      {
        id: 'cust-004',
        first_name: 'Robert',
        last_name: 'Brown',
        email: 'robert.brown@email.com',
        phone: '(415) 555-0126',
        first_visit: '2023-11-10',
        last_visit: '2024-11-15',
        total_visits: 18,
        total_spent: 1350.00,
        average_service_value: 75.00,
        preferred_barber: 'Mike Thompson',
        loyalty_points: 270,
        marketing_consent: true,
        referral_source: 'Referral',
        notes: 'VIP client, full service packages, tips well',
        status: 'vip'
      },
      {
        id: 'cust-005',
        first_name: 'James',
        last_name: 'Garcia',
        email: 'james.garcia@email.com',
        phone: '(415) 555-0127',
        first_visit: '2024-03-05',
        last_visit: '2024-11-20',
        total_visits: 9,
        total_spent: 315.00,
        average_service_value: 35.00,
        preferred_barber: 'Jamie Chen',
        loyalty_points: 63,
        marketing_consent: true,
        referral_source: 'Instagram',
        notes: 'Business executive, precise cuts',
        status: 'active'
      },
      {
        id: 'cust-006',
        first_name: 'Christopher',
        last_name: 'Lee',
        email: 'chris.lee@email.com',
        phone: '(415) 555-0128',
        first_visit: '2024-01-08',
        last_visit: '2024-11-08',
        total_visits: 11,
        total_spent: 385.00,
        average_service_value: 35.00,
        preferred_barber: 'Alex Rodriguez',
        loyalty_points: 77,
        marketing_consent: true,
        referral_source: 'Google',
        notes: 'Monthly regular, always on time',
        status: 'active'
      },
      {
        id: 'cust-007',
        first_name: 'William',
        last_name: 'Davis',
        email: 'william.davis@email.com',
        phone: '(415) 555-0129',
        first_visit: '2024-04-12',
        last_visit: '2024-10-15',
        total_visits: 6,
        total_spent: 270.00,
        average_service_value: 45.00,
        preferred_barber: 'Mike Thompson',
        loyalty_points: 54,
        marketing_consent: false,
        referral_source: 'Walk-in',
        notes: 'Beard and hair combo services',
        status: 'active'
      },
      {
        id: 'cust-008',
        first_name: 'Richard',
        last_name: 'Miller',
        email: 'richard.miller@email.com',
        phone: '(415) 555-0130',
        first_visit: '2023-12-20',
        last_visit: '2024-09-10',
        total_visits: 4,
        total_spent: 140.00,
        average_service_value: 35.00,
        preferred_barber: 'Alex Rodriguez',
        loyalty_points: 28,
        marketing_consent: true,
        referral_source: 'Referral',
        notes: 'Moved away, occasional visits',
        status: 'inactive'
      }
    ]
    
    // Filter customers based on search
    let filteredCustomers = allCustomers
    if (search) {
      const searchLower = search.toLowerCase()
      filteredCustomers = allCustomers.filter(customer => 
        customer.first_name.toLowerCase().includes(searchLower) ||
        customer.last_name.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.phone.includes(search)
      )
    }
    
    // Apply pagination
    const paginatedCustomers = filteredCustomers.slice(offset, offset + limit)
    
    // Calculate summary statistics
    const summary = {
      total_customers: filteredCustomers.length,
      active_customers: filteredCustomers.filter(c => c.status === 'active').length,
      new_customers: filteredCustomers.filter(c => c.status === 'new').length,
      vip_customers: filteredCustomers.filter(c => c.status === 'vip').length,
      inactive_customers: filteredCustomers.filter(c => c.status === 'inactive').length,
      total_lifetime_value: filteredCustomers.reduce((sum, c) => sum + c.total_spent, 0),
      average_lifetime_value: filteredCustomers.length > 0 
        ? filteredCustomers.reduce((sum, c) => sum + c.total_spent, 0) / filteredCustomers.length 
        : 0,
      retention_rate: filteredCustomers.filter(c => c.total_visits > 1).length / filteredCustomers.length * 100
    }
    
    return NextResponse.json({
      customers: paginatedCustomers,
      summary,
      pagination: {
        total: filteredCustomers.length,
        limit,
        offset,
        has_more: offset + limit < filteredCustomers.length
      }
    })
    
  } catch (error) {
    console.error('Error in /api/shop/customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const customerData = await request.json()
    
    // Mock creating a new customer
    const newCustomer = {
      id: `cust-${Date.now()}`,
      ...customerData,
      first_visit: new Date().toISOString().split('T')[0],
      total_visits: 0,
      total_spent: 0,
      average_service_value: 0,
      loyalty_points: 0,
      status: 'new',
      created_at: new Date().toISOString()
    }
    
    return NextResponse.json(newCustomer, { status: 201 })
    
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}