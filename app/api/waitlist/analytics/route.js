import { NextResponse } from 'next/server';
export const runtime = 'edge'

/**
 * @swagger
 * /api/waitlist/analytics:
 *   get:
 *     summary: Get waitlist analytics
 *     description: Retrieve comprehensive waitlist performance analytics for a barbershop
 *     tags: [Waitlist]
 *     parameters:
 *       - in: query
 *         name: barbershop_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barbershop identifier
 *       - in: query
 *         name: start_date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (default: 30 days ago)
 *       - in: query
 *         name: end_date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (default: today)
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 waitlist_stats:
 *                   type: object
 *                   properties:
 *                     total_entries:
 *                       type: integer
 *                     successful_matches:
 *                       type: integer
 *                     expired_entries:
 *                       type: integer
 *                     current_waitlist_size:
 *                       type: integer
 *                     average_wait_time_hours:
 *                       type: number
 *                     conversion_rate_percent:
 *                       type: number
 *                     revenue_from_waitlist:
 *                       type: number
 *                 cancellation_stats:
 *                   type: object
 *                   properties:
 *                     total_cancellations:
 *                       type: integer
 *                     total_refunds:
 *                       type: number
 *                     average_cancellation_fee:
 *                       type: number
 *                 performance_insights:
 *                   type: object
 *                   properties:
 *                     peak_waitlist_hours:
 *                       type: array
 *                       items:
 *                         type: string
 *                     most_requested_services:
 *                       type: array
 *                       items:
 *                         type: object
 *                     average_position_at_booking:
 *                       type: number
 *                     customer_satisfaction_score:
 *                       type: number
 *       400:
 *         description: Missing barbershop_id parameter
 *       500:
 *         description: Internal server error
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const barbershop_id = searchParams.get('barbershop_id');
        const start_date = searchParams.get('start_date');
        const end_date = searchParams.get('end_date');
        
        if (!barbershop_id) {
            return NextResponse.json(
                { success: false, error: 'barbershop_id parameter is required' },
                { status: 400 }
            );
        }
        
        // Parse dates or use defaults
        const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = end_date ? new Date(end_date) : new Date();
        
        // Simulate analytics data (in production, this would call the Python service)
        const analytics = {
            success: true,
            period: {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                days: Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000))
            },
            waitlist_stats: {
                total_entries: 127,
                successful_matches: 89,
                expired_entries: 23,
                cancelled_entries: 15,
                current_waitlist_size: 12,
                average_wait_time_hours: 36.5,
                conversion_rate_percent: 70.1,
                revenue_from_waitlist: 4455.50,
                average_position_at_booking: 2.3,
                max_waitlist_size_reached: 25
            },
            cancellation_stats: {
                total_cancellations: 34,
                total_refunds: 1250.75,
                average_cancellation_fee: 8.50,
                refund_rate_percent: 85.3,
                no_show_rate_percent: 12.5,
                same_day_cancellations: 8
            },
            performance_insights: {
                peak_waitlist_hours: [
                    { hour: 14, count: 23, percentage: 18.1 },
                    { hour: 15, count: 19, percentage: 15.0 },
                    { hour: 10, count: 16, percentage: 12.6 },
                    { hour: 16, count: 15, percentage: 11.8 }
                ],
                peak_waitlist_days: [
                    { day: 'Saturday', count: 45, percentage: 35.4 },
                    { day: 'Friday', count: 32, percentage: 25.2 },
                    { day: 'Thursday', count: 25, percentage: 19.7 },
                    { day: 'Tuesday', count: 15, percentage: 11.8 }
                ],
                most_requested_services: [
                    { 
                        service_id: 'haircut_premium', 
                        service_name: 'Premium Haircut & Style', 
                        count: 45, 
                        percentage: 35.4,
                        avg_wait_time_hours: 28.5,
                        conversion_rate: 78.9
                    },
                    { 
                        service_id: 'full_service', 
                        service_name: 'Full Service (Cut + Beard)', 
                        count: 32, 
                        percentage: 25.2,
                        avg_wait_time_hours: 42.1,
                        conversion_rate: 65.6
                    },
                    { 
                        service_id: 'haircut_classic', 
                        service_name: 'Classic Haircut', 
                        count: 28, 
                        percentage: 22.0,
                        avg_wait_time_hours: 18.3,
                        conversion_rate: 85.7
                    }
                ],
                customer_satisfaction_score: 4.2, // out of 5
                notification_response_rate: 89.5, // percentage who respond to notifications
                average_response_time_minutes: 45, // time to respond to slot offers
                repeat_waitlist_customers: 23 // customers who joined waitlist multiple times
            },
            trends: {
                weekly_comparison: {
                    this_week: { entries: 15, matches: 12, conversion: 80.0 },
                    last_week: { entries: 18, matches: 10, conversion: 55.6 },
                    change_percent: 43.9
                },
                monthly_growth: {
                    waitlist_usage_growth: 12.5, // percent increase
                    revenue_growth: 8.3,
                    customer_satisfaction_trend: 'improving'
                }
            },
            recommendations: [
                {
                    type: 'optimization',
                    priority: 'high',
                    title: 'Optimize Saturday Schedule',
                    description: 'Saturday has highest waitlist demand (35.4%). Consider adding more slots or extending hours.',
                    potential_impact: 'Up to 15% more bookings'
                },
                {
                    type: 'service',
                    priority: 'medium', 
                    title: 'Premium Service Marketing',
                    description: 'Premium services have high wait times but good conversion. Market to reduce wait times.',
                    potential_impact: 'Reduce average wait by 20%'
                },
                {
                    type: 'customer_experience',
                    priority: 'medium',
                    title: 'Improve Response Times',
                    description: 'Customer response time to slot offers averages 45 minutes. Consider incentives for faster responses.',
                    potential_impact: 'Increase slot fill rate by 10%'
                }
            ]
        };
        
        // In production, this would call:
        // const analytics = await waitlist_cancellation_service.get_waitlist_analytics(
        //     barbershop_id,
        //     startDate,
        //     endDate
        // );
        
        return NextResponse.json(analytics, { status: 200 });
        
    } catch (error) {
        console.error('Error getting waitlist analytics:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}