import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const today = new Date()
    const currentHour = today.getHours()
    const isBusinessHours = currentHour >= 9 && currentHour <= 19
    const baseBookings = isBusinessHours ? Math.floor(currentHour / 2) : 6
    
    // Complete demo data set for Elite Cuts Barbershop
    const demoData = {
      shopInfo: {
        id: 'elite-cuts-shop-123',
        name: 'Elite Cuts Barbershop',
        slug: 'elite-cuts',
        address: '2547 Broadway Street',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94115',
        phone: '(415) 555-2847',
        email: 'info@elitecuts.com',
        website: 'https://elitecuts.com',
        description: 'Premium barbershop experience with master barbers specializing in classic and modern cuts.',
        logo_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200',
        is_active: true,
        total_clients: 247,
        monthly_revenue: 18750,
        rating: 4.8,
        total_reviews: 89
      },
      
      metrics: {
        // Revenue metrics
        totalRevenue: 145680,
        monthlyRevenue: 18750,
        todayRevenue: 1240,
        weeklyRevenue: 4680,
        revenueChange: 12.5,
        
        // Booking metrics
        totalBookings: 892,
        todayBookings: baseBookings,
        weeklyBookings: 47,
        monthlyBookings: 156,
        bookingsChange: 8.3,
        
        // Staff metrics
        activeBarbers: 3,
        totalStaff: 4,
        barbersWorking: isBusinessHours ? 2 : 0,
        
        // Customer metrics
        totalClients: 247,
        newClientsThisMonth: 23,
        returningClients: 134,
        clientRetentionRate: 78.5,
        
        // Rating & Reviews
        avgRating: 4.8,
        totalReviews: 89,
        newReviewsThisWeek: 4,
        ratingTrend: 0.2
      },
      
      barbers: [
        {
          id: 'barber-alex-123',
          user_id: 'barber-alex-123',
          role: 'BARBER',
          is_active: true,
          commission_rate: 65.00,
          bookings_today: 4,
          revenue_today: 280,
          rating: 4.9,
          total_clients: 87,
          users: {
            id: 'barber-alex-123',
            email: 'alex@elitecuts.com',
            full_name: 'Alex Rodriguez',
            avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
          }
        },
        {
          id: 'barber-jamie-123',
          user_id: 'barber-jamie-123',
          role: 'BARBER',
          is_active: true,
          commission_rate: 68.00,
          bookings_today: 3,
          revenue_today: 225,
          rating: 4.8,
          total_clients: 64,
          users: {
            id: 'barber-jamie-123',
            email: 'jamie@elitecuts.com',
            full_name: 'Jamie Chen',
            avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b332-111?w=150'
          }
        },
        {
          id: 'barber-mike-123',
          user_id: 'barber-mike-123',
          role: 'BARBER',
          is_active: true,
          commission_rate: 70.00,
          bookings_today: 5,
          revenue_today: 350,
          rating: 4.9,
          total_clients: 102,
          users: {
            id: 'barber-mike-123',
            email: 'mike@elitecuts.com',
            full_name: 'Mike Thompson',
            avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
          }
        }
      ]
    }
    
    return NextResponse.json(demoData)
    
  } catch (error) {
    console.error('Error in /api/shop/demo-data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}