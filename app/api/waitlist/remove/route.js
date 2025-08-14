import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/client';
export const runtime = 'edge'

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
        
        // Real database operation - remove from waitlist
        const supabase = createClient();
        
        const { data, error } = await supabase
            .from('waitlist')
            .delete()
            .eq('id', body.waitlist_id)
            .select();
        
        if (error) {
            console.error('Database error removing from waitlist:', error);
            return NextResponse.json({
                success: false,
                error: 'Failed to remove from waitlist',
                details: error.message
            }, { status: 500 });
        }
        
        if (!data || data.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Waitlist entry not found'
            }, { status: 404 });
        }
        
        const result = {
            success: true,
            waitlist_id: body.waitlist_id,
            message: 'Successfully removed from waitlist',
            removed_entry: data[0]
        };
        
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