import { NextResponse } from 'next/server';
export const runtime = 'edge'

/**
 * @swagger
 * /api/waitlist/status:
 *   get:
 *     summary: Get waitlist status for customer
 *     description: Retrieve customer's current waitlist entries across all or specific barbershops
 *     tags: [Waitlist]
 *     parameters:
 *       - in: query
 *         name: customer_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer identifier
 *       - in: query
 *         name: barbershop_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Specific barbershop (optional)
 *     responses:
 *       200:
 *         description: Waitlist status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 waitlist_entries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       waitlist_id:
 *                         type: string
 *                       barbershop_id:
 *                         type: string
 *                       service_id:
 *                         type: string
 *                       service_name:
 *                         type: string
 *                       barber_name:
 *                         type: string
 *                       position:
 *                         type: integer
 *                       estimated_wait_minutes:
 *                         type: integer
 *                       estimated_available:
 *                         type: string
 *                         format: date-time
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       expires_at:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                       notification_count:
 *                         type: integer
 *       400:
 *         description: Missing customer_id parameter
 *       500:
 *         description: Internal server error
 */
export async function GET(request, { params }) {
    try {
        const { searchParams } = request.nextUrl;
        const customer_id = searchParams.get('customer_id');
        const barbershop_id = searchParams.get('barbershop_id');
        
        if (!customer_id) {
            return NextResponse.json(
                { success: false, error: 'customer_id parameter is required' },
                { status: 400 }
            );
        }
        
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        try {
            let query = supabase
                .from('waitlist')
                .select(`
                    id,
                    barbershop_id,
                    service_id,
                    barber_id,
                    position,
                    status,
                    created_at,
                    expires_at,
                    estimated_wait_time,
                    notification_preferences,
                    services(name),
                    barbershops(name),
                    barbers(name)
                `)
                .eq('customer_id', customer_id)
                .eq('status', 'active')
                .order('created_at', { ascending: false });
            
            if (barbershop_id) {
                query = query.eq('barbershop_id', barbershop_id);
            }
            
            const { data: waitlistData, error } = await query;
            
            if (error) {
                console.error('Database error fetching waitlist status:', error);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to fetch waitlist status',
                    waitlist_entries: []
                }, { status: 500 });
            }
            
            const waitlist_entries = waitlistData?.map(entry => {
                const position = entry.position || 1;
                const estimated_wait_minutes = position <= 1 ? 1440 : position * 1440; // 1 day per position
                
                const estimated_available = new Date(Date.now() + estimated_wait_minutes * 60 * 1000).toISOString();
                
                return {
                    waitlist_id: entry.id,
                    barbershop_id: entry.barbershop_id,
                    service_id: entry.service_id,
                    service_name: entry.services?.name || 'Unknown Service',
                    barber_name: entry.barbers?.name || (entry.barber_id ? 'Specific Barber' : 'Any Available Barber'),
                    barbershop_name: entry.barbershops?.name || 'Unknown Shop',
                    position: entry.position || 1,
                    estimated_wait_minutes: estimated_wait_minutes,
                    estimated_available: estimated_available,
                    created_at: entry.created_at,
                    expires_at: entry.expires_at,
                    status: entry.status,
                    notification_count: 0 // Could be tracked in separate table if needed
                };
            }) || [];
            
        } catch (dbError) {
            console.error('Database connection error in waitlist status:', dbError);
            return NextResponse.json({
                success: false,
                error: 'Database unavailable',
                waitlist_entries: []
            }, { status: 500 });
        }
        
        return NextResponse.json({
            success: true,
            waitlist_entries: waitlist_entries,
            total_entries: waitlist_entries.length
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error getting waitlist status:', error);
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