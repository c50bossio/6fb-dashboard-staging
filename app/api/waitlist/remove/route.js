import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/waitlist/remove:
 *   delete:
 *     summary: Remove customer from waitlist
 *     description: Remove a customer from a specific waitlist entry
 *     tags: [Waitlist]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - waitlist_id
 *             properties:
 *               waitlist_id:
 *                 type: string
 *                 description: Waitlist entry identifier
 *               reason:
 *                 type: string
 *                 default: customer_request
 *                 description: Reason for removal
 *     responses:
 *       200:
 *         description: Successfully removed from waitlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 waitlist_id:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request or waitlist entry not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request) {
    try {
        const body = await request.json();
        
        if (!body.waitlist_id) {
            return NextResponse.json(
                { success: false, error: 'waitlist_id is required' },
                { status: 400 }
            );
        }
        
        // Simulate removal (in production, this would call the Python service)
        const result = {
            success: true,
            waitlist_id: body.waitlist_id,
            message: 'Successfully removed from waitlist'
        };
        
        // In production, this would call:
        // const result = await waitlist_cancellation_service.remove_from_waitlist(
        //     body.waitlist_id,
        //     body.reason || 'customer_request'
        // );
        
        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }
        
        return NextResponse.json(result, { status: 200 });
        
    } catch (error) {
        console.error('Error removing from waitlist:', error);
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