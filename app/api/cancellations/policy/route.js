import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const runtime = 'edge'

/**
 * @swagger
 * /api/cancellations/policy:
 *   get:
 *     summary: Get cancellation policy for service
 *     description: Retrieve the cancellation policy and calculate potential refund for a service
 *     tags: [Cancellations]
 *     parameters:
 *       - in: query
 *         name: service_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service identifier
 *       - in: query
 *         name: booking_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Booking ID to calculate specific refund amount
 *       - in: query
 *         name: simulate_hours
 *         required: false
 *         schema:
 *           type: number
 *         description: Simulate cancellation X hours before appointment
 *     responses:
 *       200:
 *         description: Cancellation policy retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 policy:
 *                   type: object
 *                   properties:
 *                     service_id:
 *                       type: string
 *                     policy_type:
 *                       type: string
 *                     full_refund_hours:
 *                       type: integer
 *                     partial_refund_hours:
 *                       type: integer
 *                     partial_refund_percentage:
 *                       type: number
 *                     cancellation_fee:
 *                       type: number
 *                     no_show_fee:
 *                       type: number
 *                 refund_scenarios:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       hours_before:
 *                         type: number
 *                       refund_amount:
 *                         type: number
 *                       refund_percentage:
 *                         type: number
 *                       description:
 *                         type: string
 *                 current_refund:
 *                   type: object
 *                   properties:
 *                     refund_amount:
 *                       type: number
 *                     cancellation_fee:
 *                       type: number
 *                     reason:
 *                       type: string
 *       400:
 *         description: Missing service_id parameter
 *       500:
 *         description: Internal server error
 */
export async function GET(request) {
    try {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);
        
        const { searchParams } = new URL(request.url);
        const service_id = searchParams.get('service_id');
        const booking_id = searchParams.get('booking_id');
        const simulate_hours = parseFloat(searchParams.get('simulate_hours') || '0');
        
        if (!service_id) {
            return NextResponse.json(
                { success: false, error: 'service_id parameter is required' },
                { status: 400 }
            );
        }
        
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('*')
            .eq('id', service_id)
            .single();
        
        if (serviceError || !service) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Service not found',
                    service_id: service_id,
                    data_available: false,
                    message: 'Please check service ID and ensure service exists in database.'
                },
                { status: 404 }
            );
        }
        
        const { data: shopPolicy, error: policyError } = await supabase
            .from('cancellation_policies')
            .select('*')
            .eq('barbershop_id', service.barbershop_id)
            .single();
        
        let policy;
        if (shopPolicy) {
            policy = {
                service_id: service_id,
                policy_type: shopPolicy.policy_type || 'standard',
                full_refund_hours: shopPolicy.full_refund_hours || 24,
                partial_refund_hours: shopPolicy.partial_refund_hours || 2,
                partial_refund_percentage: shopPolicy.partial_refund_percentage || 50.0,
                cancellation_fee: shopPolicy.cancellation_fee || 5.0,
                no_show_fee: shopPolicy.no_show_fee || 25.0
            };
        } else {
            const isExpensive = service.price > 60;
            const isLongService = service.duration_minutes > 60;
            
            policy = {
                service_id: service_id,
                policy_type: isExpensive || isLongService ? 'strict' : 'standard',
                full_refund_hours: isExpensive || isLongService ? 48 : 24,
                partial_refund_hours: isExpensive || isLongService ? 4 : 2,
                partial_refund_percentage: isExpensive || isLongService ? 25.0 : 50.0,
                cancellation_fee: isExpensive ? 10.0 : 5.0,
                no_show_fee: isExpensive ? 35.0 : 25.0
            };
        }
        
        const service_price = service.price || 50.00;
        
        const scenarios = [
            { hours: 72, description: "3+ days before" },
            { hours: 48, description: "2 days before" },
            { hours: 24, description: "1 day before" },
            { hours: 12, description: "12 hours before" },
            { hours: 4, description: "4 hours before" },
            { hours: 2, description: "2 hours before" },
            { hours: 1, description: "1 hour before" },
            { hours: 0, description: "No-show" }
        ];
        
        const refund_scenarios = scenarios.map(scenario => {
            let refund_amount, refund_percentage;
            
            if (scenario.hours === 0) {
                refund_amount = Math.max(0, service_price - policy.no_show_fee);
                refund_percentage = Math.round((refund_amount / service_price) * 100);
            } else if (scenario.hours >= policy.full_refund_hours) {
                refund_amount = service_price - policy.cancellation_fee;
                refund_percentage = Math.round((refund_amount / service_price) * 100);
            } else if (scenario.hours >= policy.partial_refund_hours) {
                refund_amount = (service_price * policy.partial_refund_percentage / 100) - policy.cancellation_fee;
                refund_percentage = policy.partial_refund_percentage;
            } else {
                refund_amount = 0;
                refund_percentage = 0;
            }
            
            return {
                hours_before: scenario.hours,
                refund_amount: Math.max(0, refund_amount),
                refund_percentage: refund_percentage,
                cancellation_fee: scenario.hours === 0 ? policy.no_show_fee : 
                                scenario.hours >= policy.full_refund_hours ? policy.cancellation_fee :
                                scenario.hours >= policy.partial_refund_hours ? policy.cancellation_fee : service_price,
                description: scenario.description
            };
        });
        
        let current_refund = null;
        
        if (booking_id) {
            const { data: booking } = await supabase
                .from('bookings')
                .select('scheduled_at, total_amount')
                .eq('id', booking_id)
                .single();
            
            if (booking) {
                const scheduledAt = new Date(booking.scheduled_at);
                const now = new Date();
                const hours_until = (scheduledAt - now) / (1000 * 60 * 60);
                const booking_amount = booking.total_amount || service_price;
                
                let refund_amount, cancellation_fee, reason;
                
                if (hours_until >= policy.full_refund_hours) {
                    refund_amount = booking_amount - policy.cancellation_fee;
                    cancellation_fee = policy.cancellation_fee;
                    reason = `Full refund (cancelled ${hours_until.toFixed(1)}h in advance)`;
                } else if (hours_until >= policy.partial_refund_hours) {
                    refund_amount = (booking_amount * policy.partial_refund_percentage / 100) - policy.cancellation_fee;
                    cancellation_fee = policy.cancellation_fee;
                    reason = `${policy.partial_refund_percentage}% refund (cancelled ${hours_until.toFixed(1)}h in advance)`;
                } else {
                    refund_amount = 0;
                    cancellation_fee = booking_amount;
                    reason = `No refund (cancelled ${hours_until.toFixed(1)}h in advance, policy requires ${policy.partial_refund_hours}h)`;
                }
                
                current_refund = {
                    hours_until_appointment: parseFloat(hours_until.toFixed(1)),
                    original_amount: booking_amount,
                    refund_amount: Math.max(0, refund_amount),
                    cancellation_fee: cancellation_fee,
                    net_loss: booking_amount - Math.max(0, refund_amount),
                    reason: reason,
                    policy_applied: policy.policy_type
                };
            }
        } else if (simulate_hours > 0) {
            const hours_until = simulate_hours;
            
            let refund_amount, cancellation_fee, reason;
            
            if (hours_until >= policy.full_refund_hours) {
                refund_amount = service_price - policy.cancellation_fee;
                cancellation_fee = policy.cancellation_fee;
                reason = `Full refund (cancelled ${hours_until.toFixed(1)}h in advance)`;
            } else if (hours_until >= policy.partial_refund_hours) {
                refund_amount = (service_price * policy.partial_refund_percentage / 100) - policy.cancellation_fee;
                cancellation_fee = policy.cancellation_fee;
                reason = `${policy.partial_refund_percentage}% refund (cancelled ${hours_until.toFixed(1)}h in advance)`;
            } else {
                refund_amount = 0;
                cancellation_fee = service_price;
                reason = `No refund (cancelled ${hours_until.toFixed(1)}h in advance, policy requires ${policy.partial_refund_hours}h)`;
            }
            
            current_refund = {
                hours_until_appointment: parseFloat(hours_until.toFixed(1)),
                original_amount: service_price,
                refund_amount: Math.max(0, refund_amount),
                cancellation_fee: cancellation_fee,
                net_loss: service_price - Math.max(0, refund_amount),
                reason: reason,
                policy_applied: policy.policy_type
            };
        }
        
        const response = {
            success: true,
            policy: policy,
            service_details: {
                service_id: service_id,
                service_name: service.name || 'Service',
                base_price: service_price,
                duration_minutes: service.duration_minutes || 30,
                currency: 'USD'
            },
            refund_scenarios: refund_scenarios,
            current_refund: current_refund,
            policy_summary: {
                type: policy.policy_type,
                flexibility: policy.policy_type === 'flexible' ? 'High' :
                           policy.policy_type === 'standard' ? 'Medium' : 'Low',
                key_points: [
                    `Full refund if cancelled ${policy.full_refund_hours}+ hours in advance`,
                    `${policy.partial_refund_percentage}% refund if cancelled ${policy.partial_refund_hours}+ hours in advance`,
                    `$${policy.cancellation_fee} cancellation fee applies`,
                    `$${policy.no_show_fee} fee for no-shows`
                ]
            }
        };
        
        return NextResponse.json(response, { status: 200 });
        
    } catch (error) {
        console.error('Error getting cancellation policy:', error);
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