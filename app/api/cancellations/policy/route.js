import { NextResponse } from 'next/server';

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
        
        // Simulate policy retrieval (in production, this would call the Python service)
        const policies = {
            'haircut_classic': {
                policy_type: 'flexible',
                full_refund_hours: 2,
                partial_refund_hours: 1,
                partial_refund_percentage: 100.0,
                cancellation_fee: 0.0,
                no_show_fee: 15.0
            },
            'haircut_premium': {
                policy_type: 'standard',
                full_refund_hours: 24,
                partial_refund_hours: 2,
                partial_refund_percentage: 50.0,
                cancellation_fee: 5.0,
                no_show_fee: 25.0
            },
            'full_service': {
                policy_type: 'standard',
                full_refund_hours: 24,
                partial_refund_hours: 4,
                partial_refund_percentage: 50.0,
                cancellation_fee: 10.0,
                no_show_fee: 35.0
            },
            'hot_towel_shave': {
                policy_type: 'strict',
                full_refund_hours: 48,
                partial_refund_hours: 4,
                partial_refund_percentage: 25.0,
                cancellation_fee: 15.0,
                no_show_fee: 45.0
            }
        };
        
        const policy = policies[service_id] || policies['haircut_premium']; // default
        policy.service_id = service_id;
        
        // Simulate service pricing
        const service_prices = {
            'haircut_classic': 35.00,
            'haircut_premium': 55.00,
            'beard_trim': 25.00,
            'full_service': 75.00,
            'hot_towel_shave': 45.00,
            'kids_cut': 25.00
        };
        
        const service_price = service_prices[service_id] || 50.00;
        
        // Generate refund scenarios for different timing
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
                // No-show
                refund_amount = Math.max(0, service_price - policy.no_show_fee);
                refund_percentage = Math.round((refund_amount / service_price) * 100);
            } else if (scenario.hours >= policy.full_refund_hours) {
                // Full refund
                refund_amount = service_price - policy.cancellation_fee;
                refund_percentage = Math.round((refund_amount / service_price) * 100);
            } else if (scenario.hours >= policy.partial_refund_hours) {
                // Partial refund
                refund_amount = (service_price * policy.partial_refund_percentage / 100) - policy.cancellation_fee;
                refund_percentage = policy.partial_refund_percentage;
            } else {
                // No refund
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
        
        // Calculate current refund if booking_id is provided or simulate_hours is specified
        if (booking_id || simulate_hours > 0) {
            const hours_until = booking_id ? 
                Math.random() * 48 + 1 : // Simulate random hours for demo
                simulate_hours;
            
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
                base_price: service_price,
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
        
        // In production, this would call:
        // const policy = await waitlist_cancellation_service.get_cancellation_policy(service_id);
        
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