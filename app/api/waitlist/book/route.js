import { NextResponse } from 'next/server';
export const runtime = 'edge'

/**
 * @swagger
 * /api/waitlist/book:
 *   post:
 *     summary: Book appointment from waitlist
 *     description: Process booking from waitlist when slot becomes available
 *     tags: [Waitlist]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - waitlist_id
 *               - slot_time
 *             properties:
 *               waitlist_id:
 *                 type: string
 *                 description: Waitlist entry identifier
 *               slot_time:
 *                 type: string
 *                 format: date-time
 *                 description: Available slot time
 *               barber_id:
 *                 type: string
 *                 description: Assigned barber (optional)
 *               auto_confirm:
 *                 type: boolean
 *                 default: true
 *                 description: Automatically confirm the booking
 *     responses:
 *       200:
 *         description: Booking successfully created from waitlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 booking_id:
 *                   type: string
 *                 waitlist_id:
 *                   type: string
 *                 slot_time:
 *                   type: string
 *                   format: date-time
 *                 barber_id:
 *                   type: string
 *                 service_details:
 *                   type: object
 *                   properties:
 *                     service_id:
 *                       type: string
 *                     service_name:
 *                       type: string
 *                     duration:
 *                       type: integer
 *                     price:
 *                       type: number
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request or slot no longer available
 *       500:
 *         description: Internal server error
 */
export async function POST(request) {
    try {
        const body = await request.json();
        
        // Validate required fields
        if (!body.waitlist_id || !body.slot_time) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'waitlist_id and slot_time are required' 
                },
                { status: 400 }
            );
        }
        
        // Validate slot_time format
        const slot_time = new Date(body.slot_time);
        if (isNaN(slot_time.getTime())) {
            return NextResponse.json(
                { success: false, error: 'Invalid slot_time format' },
                { status: 400 }
            );
        }
        
        // Check if slot is in the future
        if (slot_time <= new Date()) {
            return NextResponse.json(
                { success: false, error: 'Slot time must be in the future' },
                { status: 400 }
            );
        }
        
        // Simulate booking creation (in production, this would call the Python service)
        const result = {
            success: true,
            booking_id: `booking_${Date.now()}`,
            waitlist_id: body.waitlist_id,
            slot_time: body.slot_time,
            barber_id: body.barber_id || 'barber_auto_assigned',
            service_details: {
                service_id: 'haircut_premium',
                service_name: 'Premium Haircut & Style',
                duration: 45,
                price: 55.00
            },
            payment_required: true,
            payment_deadline: new Date(slot_time.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours before
            message: 'Booking successfully created from waitlist'
        };
        
        // In production, this would call:
        // const result = await waitlist_cancellation_service.process_waitlist_booking(
        //     body.waitlist_id,
        //     slot_time,
        //     body.barber_id,
        //     body.auto_confirm !== false
        // );
        
        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }
        
        // If booking was successful, trigger additional processes
        if (result.success && result.booking_id) {
            // In production, these would be handled by the service:
            // 1. Send confirmation notification to customer
            // 2. Update waitlist positions for remaining customers
            // 3. Create payment intent if payment is required
            // 4. Log booking conversion analytics
            
            result.next_steps = [
                {
                    action: 'payment_required',
                    description: 'Complete payment to confirm booking',
                    deadline: result.payment_deadline,
                    payment_url: `/payment/${result.booking_id}`
                },
                {
                    action: 'calendar_sync',
                    description: 'Add appointment to your calendar',
                    calendar_link: `/calendar/add/${result.booking_id}`
                }
            ];
        }
        
        return NextResponse.json(result, { status: 200 });
        
    } catch (error) {
        console.error('Error processing waitlist booking:', error);
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