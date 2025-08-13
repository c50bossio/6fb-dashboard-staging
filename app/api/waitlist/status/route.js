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
        
        // Simulate waitlist status data (in production, this would call the Python service)
        const waitlist_entries = [
            {
                waitlist_id: 'wl_12345678',
                barbershop_id: 'barbershop_456',
                service_id: 'haircut_premium',
                service_name: 'Premium Haircut & Style',
                barber_name: 'John Smith',
                position: 3,
                estimated_wait_minutes: 4320, // 3 days
                estimated_available: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                expires_at: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                notification_count: 2
            },
            {
                waitlist_id: 'wl_87654321',
                barbershop_id: 'barbershop_789',
                service_id: 'full_service',
                service_name: 'Full Service (Cut + Beard)',
                barber_name: 'Any Available Barber',
                position: 1,
                estimated_wait_minutes: 1440, // 1 day
                estimated_available: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                expires_at: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                notification_count: 1
            }
        ];
        
        // Filter by barbershop if specified
        const filtered_entries = barbershop_id 
            ? waitlist_entries.filter(entry => entry.barbershop_id === barbershop_id)
            : waitlist_entries;
        
        // In production, this would call:
        // const waitlist_entries = await waitlist_cancellation_service.get_waitlist_status(
        //     customer_id,
        //     barbershop_id
        // );
        
        return NextResponse.json({
            success: true,
            waitlist_entries: filtered_entries,
            total_entries: filtered_entries.length
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