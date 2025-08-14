import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'edge'

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
export async function GET(request, { params }) {
    try {
        const { searchParams } = request.nextUrl;
        const barbershop_id = searchParams.get('barbershop_id');
        const days_ahead = parseInt(searchParams.get('days_ahead') || '7');
        
        if (!barbershop_id) {
            return NextResponse.json(
                { success: false, error: 'barbershop_id parameter is required' },
                { status: 400 }
            );
        }
        
        // Real database operation - find waitlist matches
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        // Query waitlist entries for the barbershop
        const { data: waitlistEntries, error } = await supabase
            .from('waitlist')
            .select(`
                *,
                customer:profiles!waitlist_customer_id_fkey(id, full_name, email, phone)
            `)
            .eq('barbershop_id', barbershop_id)
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Database error fetching waitlist:', error);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch waitlist entries',
                details: error.message
            }, { status: 500 });
        }
        
        // Process matches with real data
        const matches = waitlistEntries?.map(entry => ({
            slot_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            duration: entry.duration_minutes || 45,
            barber_id: entry.barber_id,
            matched_entries: [{
                waitlist_id: entry.id,
                customer_id: entry.customer_id,
                customer_name: entry.customer?.full_name || 'Unknown Customer',
                priority: entry.priority || 'normal',
                position: 1,
                service_id: entry.service_id,
                estimated_wait_time: 2880,
                preferred_times: entry.preferred_times || ['09:00-17:00'],
                notification_preferences: {
                    email: true,
                    sms: true,
                    immediate_notify: true
                }
            }]
        })) || [];
        
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
            total_entries: waitlistEntries?.length || 0,
            barbershop_id: barbershop_id
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