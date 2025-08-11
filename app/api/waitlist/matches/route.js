import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/waitlist/matches:
 *   get:
 *     summary: Find waitlist matches for available slots
 *     description: Get optimal matches between available slots and waitlist entries using AI
 *     tags: [Waitlist]
 *     parameters:
 *       - in: query
 *         name: barbershop_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barbershop identifier
 *       - in: query
 *         name: days_ahead
 *         required: false
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to look ahead for matches
 *     responses:
 *       200:
 *         description: Waitlist matches found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 matches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       slot_time:
 *                         type: string
 *                         format: date-time
 *                       duration:
 *                         type: integer
 *                       barber_id:
 *                         type: string
 *                       matched_entries:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             waitlist_id:
 *                               type: string
 *                             customer_id:
 *                               type: string
 *                             priority:
 *                               type: string
 *                             position:
 *                               type: integer
 *                       priority_score:
 *                         type: number
 *                       estimated_bookings:
 *                         type: integer
 *                       revenue_potential:
 *                         type: number
 *                 total_matches:
 *                   type: integer
 *       400:
 *         description: Missing barbershop_id parameter
 *       500:
 *         description: Internal server error
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const barbershop_id = searchParams.get('barbershop_id');
        const days_ahead = parseInt(searchParams.get('days_ahead') || '7');
        
        if (!barbershop_id) {
            return NextResponse.json(
                { success: false, error: 'barbershop_id parameter is required' },
                { status: 400 }
            );
        }
        
        // Simulate waitlist matches (in production, this would call the Python service)
        const matches = [
            {
                slot_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
                duration: 45,
                barber_id: 'barber_123',
                matched_entries: [
                    {
                        waitlist_id: 'wl_12345678',
                        customer_id: 'customer_456',
                        customer_name: await getUserFromDatabase(),
                        priority: 'high',
                        position: 1,
                        service_id: 'haircut_premium',
                        estimated_wait_time: 2880, // 2 days in minutes
                        preferred_times: ['09:00-12:00', '14:00-17:00'],
                        notification_preferences: {
                            email: true,
                            sms: true,
                            immediate_notify: true
                        }
                    },
                    {
                        waitlist_id: 'wl_87654321',
                        customer_id: 'customer_789',
                        customer_name: 'Jane Smith',
                        priority: 'medium',
                        position: 2,
                        service_id: 'haircut_premium',
                        estimated_wait_time: 4320, // 3 days in minutes
                        preferred_times: ['10:00-16:00'],
                        notification_preferences: {
                            email: true,
                            sms: false,
                            immediate_notify: true
                        }
                    }
                ],
                priority_score: 85.5,
                estimated_bookings: 2,
                revenue_potential: 110.0
            },
            {
                slot_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 3 days + 2 hours
                duration: 60,
                barber_id: 'barber_456',
                matched_entries: [
                    {
                        waitlist_id: 'wl_11111111',
                        customer_id: 'customer_111',
                        customer_name: 'Bob Johnson',
                        priority: 'urgent',
                        position: 1,
                        service_id: 'full_service',
                        estimated_wait_time: 1440, // 1 day in minutes
                        preferred_times: ['14:00-18:00'],
                        notification_preferences: {
                            email: true,
                            sms: true,
                            push: true,
                            immediate_notify: true
                        }
                    }
                ],
                priority_score: 95.0,
                estimated_bookings: 1,
                revenue_potential: 75.0
            },
            {
                slot_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
                duration: 30,
                barber_id: null, // Any available barber
                matched_entries: [
                    {
                        waitlist_id: 'wl_22222222',
                        customer_id: 'customer_222',
                        customer_name: 'Sarah Wilson',
                        priority: 'low',
                        position: 5,
                        service_id: 'beard_trim',
                        estimated_wait_time: 7200, // 5 days in minutes
                        preferred_times: ['09:00-17:00'],
                        notification_preferences: {
                            email: true,
                            sms: false,
                            immediate_notify: false,
                            daily_updates: true
                        }
                    }
                ],
                priority_score: 60.0,
                estimated_bookings: 1,
                revenue_potential: 25.0
            }
        ];
        
        // In production, this would call:
        // const matches = await waitlist_cancellation_service.find_waitlist_matches(
        //     barbershop_id,
        //     null, // available_slots - let service find them
        //     days_ahead
        // );
        
        return NextResponse.json({
            success: true,
            matches: matches,
            total_matches: matches.length,
            total_potential_revenue: matches.reduce((sum, match) => sum + match.revenue_potential, 0),
            total_potential_bookings: matches.reduce((sum, match) => sum + match.estimated_bookings, 0)
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error finding waitlist matches:', error);
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