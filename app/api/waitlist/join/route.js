import { NextResponse } from 'next/server';
export const runtime = 'edge'

/**
 * @swagger
 * /api/waitlist/join:
 *   post:
 *     summary: Join waitlist for a service
 *     description: Add customer to waitlist with intelligent positioning based on priority and preferences
 *     tags: [Waitlist]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *               - barbershop_id
 *               - service_id
 *             properties:
 *               customer_id:
 *                 type: string
 *                 description: Customer identifier
 *               barbershop_id:
 *                 type: string
 *                 description: Barbershop identifier
 *               service_id:
 *                 type: string
 *                 description: Service identifier
 *               barber_id:
 *                 type: string
 *                 description: Preferred barber (optional)
 *               preferred_dates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date-time
 *                 description: Preferred appointment dates
 *               preferred_times:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Preferred time ranges (e.g., "09:00-12:00")
 *               priority:
 *                 type: string
 *                 enum: [urgent, high, medium, low]
 *                 default: medium
 *               max_wait_days:
 *                 type: integer
 *                 default: 14
 *                 description: Maximum days willing to wait
 *               notes:
 *                 type: string
 *                 description: Additional customer notes
 *               notification_preferences:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                   sms:
 *                     type: boolean
 *                   push:
 *                     type: boolean
 *                   immediate_notify:
 *                     type: boolean
 *                   daily_updates:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Successfully joined waitlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 waitlist_id:
 *                   type: string
 *                 position:
 *                   type: integer
 *                 estimated_wait_time:
 *                   type: string
 *                 expires_at:
 *                   type: string
 *                   format: date-time
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request or already on waitlist
 *       500:
 *         description: Internal server error
 */
export async function POST(request) {
    try {
        const body = await request.json();
        
        const requiredFields = ['customer_id', 'barbershop_id', 'service_id'];
        const missingFields = requiredFields.filter(field => !body[field]);
        
        if (missingFields.length > 0) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: `Missing required fields: ${missingFields.join(', ')}` 
                },
                { status: 400 }
            );
        }
        
        let preferred_dates = null;
        if (body.preferred_dates && Array.isArray(body.preferred_dates)) {
            preferred_dates = body.preferred_dates.map(date => new Date(date));
        }
        
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        try {
            const { data: existingEntry } = await supabase
                .from('waitlist')
                .select('id, position')
                .eq('customer_id', body.customer_id)
                .eq('barbershop_id', body.barbershop_id)
                .eq('service_id', body.service_id)
                .eq('status', 'active')
                .single();
            
            if (existingEntry) {
                return NextResponse.json({
                    success: false,
                    error: 'Customer already on waitlist for this service',
                    existing_position: existingEntry.position
                }, { status: 400 });
            }
            
            const { count: currentCount } = await supabase
                .from('waitlist')
                .select('id', { count: 'exact', head: true })
                .eq('barbershop_id', body.barbershop_id)
                .eq('service_id', body.service_id)
                .eq('status', 'active');
            
            const position = body.priority === 'urgent' ? 1 : (currentCount || 0) + 1;
            
            const { data: waitlistEntry, error } = await supabase
                .from('waitlist')
                .insert([{
                    customer_id: body.customer_id,
                    barbershop_id: body.barbershop_id,
                    service_id: body.service_id,
                    barber_id: body.barber_id || null,
                    preferred_dates: preferred_dates ? JSON.stringify(preferred_dates) : null,
                    preferred_times: body.preferred_times ? JSON.stringify(body.preferred_times) : null,
                    priority: body.priority || 'medium',
                    max_wait_days: body.max_wait_days || 14,
                    notes: body.notes || '',
                    notification_preferences: body.notification_preferences || {
                        email: true,
                        sms: false,
                        immediate_notify: true
                    },
                    position: position,
                    status: 'active',
                    expires_at: new Date(Date.now() + (body.max_wait_days || 14) * 24 * 60 * 60 * 1000).toISOString()
                }])
                .select()
                .single();
            
            if (error) {
                throw error;
            }
            
            const estimated_wait_time = position <= 3 ? '1-2 days' : position <= 7 ? '2-4 days' : '5-7 days';
            
            const result = {
                success: true,
                waitlist_id: waitlistEntry.id,
                position: waitlistEntry.position,
                estimated_wait_time: estimated_wait_time,
                expires_at: waitlistEntry.expires_at,
                message: `Successfully added to waitlist at position ${waitlistEntry.position}`
            };
            
        } catch (dbError) {
            console.error('Database error in waitlist join:', dbError);
            return NextResponse.json({
                success: false,
                error: 'Failed to join waitlist',
                details: 'Database operation failed'
            }, { status: 500 });
        }
        
        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }
        
        return NextResponse.json(result, { status: 200 });
        
    } catch (error) {
        console.error('Error joining waitlist:', error);
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