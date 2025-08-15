import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge'

/**
 * @swagger
 * /api/waitlist/analytics:
 *   get:
 *     summary: Get waitlist analytics
 *     description: Retrieve comprehensive waitlist performance analytics for a barbershop
 *     tags: [Waitlist]
 *     parameters:
 *       - in: query
 *         name: barbershop_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barbershop identifier
 *       - in: query
 *         name: start_date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (default: 30 days ago)
 *       - in: query
 *         name: end_date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (default: today)
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 waitlist_stats:
 *                   type: object
 *                   properties:
 *                     total_entries:
 *                       type: integer
 *                     successful_matches:
 *                       type: integer
 *                     expired_entries:
 *                       type: integer
 *                     current_waitlist_size:
 *                       type: integer
 *                     average_wait_time_hours:
 *                       type: number
 *                     conversion_rate_percent:
 *                       type: number
 *                     revenue_from_waitlist:
 *                       type: number
 *                 cancellation_stats:
 *                   type: object
 *                   properties:
 *                     total_cancellations:
 *                       type: integer
 *                     total_refunds:
 *                       type: number
 *                     average_cancellation_fee:
 *                       type: number
 *                 performance_insights:
 *                   type: object
 *                   properties:
 *                     peak_waitlist_hours:
 *                       type: array
 *                       items:
 *                         type: string
 *                     most_requested_services:
 *                       type: array
 *                       items:
 *                         type: object
 *                     average_position_at_booking:
 *                       type: number
 *                     customer_satisfaction_score:
 *                       type: number
 *       400:
 *         description: Missing barbershop_id parameter
 *       500:
 *         description: Internal server error
 */
export async function GET(request) {
    try {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);
        
        const { searchParams } = new URL(request.url);
        const barbershop_id = searchParams.get('barbershop_id');
        const start_date = searchParams.get('start_date');
        const end_date = searchParams.get('end_date');
        
        if (!barbershop_id) {
            return NextResponse.json(
                { success: false, error: 'barbershop_id parameter is required' },
                { status: 400 }
            );
        }
        
        const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = end_date ? new Date(end_date) : new Date();
        
        const { data: waitlistEntries, error: waitlistError } = await supabase
            .from('waitlist')
            .select(`
                *,
                services(name, price),
                customers(name, email)
            `)
            .eq('barbershop_id', barbershop_id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        
        if (waitlistError) {
            console.error('Error fetching waitlist data:', waitlistError);
        }
        
        const entries = waitlistEntries || [];
        
        const totalEntries = entries.length;
        const successfulMatches = entries.filter(e => e.status === 'matched' || e.status === 'booked').length;
        const expiredEntries = entries.filter(e => e.status === 'expired').length;
        const cancelledEntries = entries.filter(e => e.status === 'cancelled').length;
        const currentWaitlist = entries.filter(e => e.status === 'waiting').length;
        
        const matchedEntries = entries.filter(e => e.matched_at);
        const waitTimes = matchedEntries.map(e => {
            const created = new Date(e.created_at);
            const matched = new Date(e.matched_at);
            return (matched - created) / (1000 * 60 * 60); // hours
        });
        const avgWaitTime = waitTimes.length > 0 
            ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length 
            : 0;
        
        const { data: waitlistBookings } = await supabase
            .from('bookings')
            .select('total_amount')
            .eq('barbershop_id', barbershop_id)
            .eq('source', 'waitlist')
            .eq('status', 'completed')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        
        const revenueFromWaitlist = (waitlistBookings || [])
            .reduce((sum, b) => sum + (b.total_amount || 0), 0);
        
        const { data: cancellations } = await supabase
            .from('cancellations')
            .select('refund_amount, cancellation_fee')
            .in('booking_id', entries.map(e => e.booking_id).filter(Boolean))
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        
        const totalCancellations = cancellations?.length || 0;
        const totalRefunds = (cancellations || [])
            .reduce((sum, c) => sum + (c.refund_amount || 0), 0);
        const avgCancellationFee = totalCancellations > 0
            ? (cancellations || []).reduce((sum, c) => sum + (c.cancellation_fee || 0), 0) / totalCancellations
            : 0;
        
        const hourCounts = {};
        entries.forEach(e => {
            const hour = new Date(e.created_at).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        const peakHours = Object.entries(hourCounts)
            .map(([hour, count]) => ({
                hour: parseInt(hour),
                count: count,
                percentage: totalEntries > 0 ? (count / totalEntries * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);
        
        const dayCounts = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        entries.forEach(e => {
            const dayIndex = new Date(e.created_at).getDay();
            const dayName = dayNames[dayIndex];
            dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
        });
        
        const peakDays = Object.entries(dayCounts)
            .map(([day, count]) => ({
                day: day,
                count: count,
                percentage: totalEntries > 0 ? (count / totalEntries * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);
        
        const serviceCounts = {};
        entries.forEach(e => {
            if (e.service_id) {
                if (!serviceCounts[e.service_id]) {
                    serviceCounts[e.service_id] = {
                        service_id: e.service_id,
                        service_name: e.services?.name || 'Unknown Service',
                        count: 0,
                        matched: 0,
                        totalWaitTime: 0
                    };
                }
                serviceCounts[e.service_id].count++;
                if (e.status === 'matched' || e.status === 'booked') {
                    serviceCounts[e.service_id].matched++;
                    if (e.matched_at) {
                        const waitTime = (new Date(e.matched_at) - new Date(e.created_at)) / (1000 * 60 * 60);
                        serviceCounts[e.service_id].totalWaitTime += waitTime;
                    }
                }
            }
        });
        
        const mostRequestedServices = Object.values(serviceCounts)
            .map(s => ({
                service_id: s.service_id,
                service_name: s.service_name,
                count: s.count,
                percentage: totalEntries > 0 ? (s.count / totalEntries * 100).toFixed(1) : 0,
                avg_wait_time_hours: s.matched > 0 ? (s.totalWaitTime / s.matched).toFixed(1) : 0,
                conversion_rate: s.count > 0 ? (s.matched / s.count * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
        
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        
        const thisWeekEntries = entries.filter(e => new Date(e.created_at) >= oneWeekAgo);
        const lastWeekEntries = entries.filter(e => {
            const created = new Date(e.created_at);
            return created >= twoWeeksAgo && created < oneWeekAgo;
        });
        
        const thisWeekMatches = thisWeekEntries.filter(e => e.status === 'matched' || e.status === 'booked').length;
        const lastWeekMatches = lastWeekEntries.filter(e => e.status === 'matched' || e.status === 'booked').length;
        
        const analytics = {
            success: true,
            period: {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                days: Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000))
            },
            waitlist_stats: {
                total_entries: totalEntries,
                successful_matches: successfulMatches,
                expired_entries: expiredEntries,
                cancelled_entries: cancelledEntries,
                current_waitlist_size: currentWaitlist,
                average_wait_time_hours: parseFloat(avgWaitTime.toFixed(1)),
                conversion_rate_percent: totalEntries > 0 
                    ? parseFloat((successfulMatches / totalEntries * 100).toFixed(1))
                    : 0,
                revenue_from_waitlist: revenueFromWaitlist,
                average_position_at_booking: 0, // Would need position tracking
                max_waitlist_size_reached: Math.max(...Object.values(dayCounts), 0)
            },
            cancellation_stats: {
                total_cancellations: totalCancellations,
                total_refunds: totalRefunds,
                average_cancellation_fee: parseFloat(avgCancellationFee.toFixed(2)),
                refund_rate_percent: totalCancellations > 0 
                    ? parseFloat((totalRefunds / (totalCancellations * 50) * 100).toFixed(1)) // Assuming avg booking is $50
                    : 0,
                no_show_rate_percent: 0, // Would need no-show tracking
                same_day_cancellations: 0 // Would need same-day tracking
            },
            performance_insights: {
                peak_waitlist_hours: peakHours,
                peak_waitlist_days: peakDays,
                most_requested_services: mostRequestedServices,
                customer_satisfaction_score: 0, // Would need satisfaction tracking
                notification_response_rate: 0, // Would need response tracking
                average_response_time_minutes: 0, // Would need response time tracking
                repeat_waitlist_customers: 0 // Would need customer tracking
            },
            trends: {
                weekly_comparison: {
                    this_week: {
                        entries: thisWeekEntries.length,
                        matches: thisWeekMatches,
                        conversion: thisWeekEntries.length > 0 
                            ? parseFloat((thisWeekMatches / thisWeekEntries.length * 100).toFixed(1))
                            : 0
                    },
                    last_week: {
                        entries: lastWeekEntries.length,
                        matches: lastWeekMatches,
                        conversion: lastWeekEntries.length > 0
                            ? parseFloat((lastWeekMatches / lastWeekEntries.length * 100).toFixed(1))
                            : 0
                    },
                    change_percent: lastWeekMatches > 0
                        ? parseFloat(((thisWeekMatches - lastWeekMatches) / lastWeekMatches * 100).toFixed(1))
                        : 0
                },
                monthly_growth: {
                    waitlist_usage_growth: 0, // Would need historical data
                    revenue_growth: 0, // Would need historical revenue data
                    customer_satisfaction_trend: 'stable'
                }
            },
            recommendations: [],
            data_available: totalEntries > 0
        };
        
        if (totalEntries > 0) {
            if (peakDays.length > 0 && peakDays[0].percentage > 30) {
                analytics.recommendations.push({
                    type: 'optimization',
                    priority: 'high',
                    title: `Optimize ${peakDays[0].day} Schedule`,
                    description: `${peakDays[0].day} has highest waitlist demand (${peakDays[0].percentage}%). Consider adding more slots or extending hours.`,
                    potential_impact: 'Up to 15% more bookings'
                });
            }
            
            if (avgWaitTime > 48) {
                analytics.recommendations.push({
                    type: 'service',
                    priority: 'high',
                    title: 'Reduce Wait Times',
                    description: `Average wait time is ${avgWaitTime.toFixed(0)} hours. Consider increasing availability or optimizing scheduling.`,
                    potential_impact: 'Improve customer satisfaction'
                });
            }
            
            if (analytics.waitlist_stats.conversion_rate_percent < 60) {
                analytics.recommendations.push({
                    type: 'customer_experience',
                    priority: 'medium',
                    title: 'Improve Conversion Rate',
                    description: `Conversion rate is ${analytics.waitlist_stats.conversion_rate_percent}%. Consider faster notifications or incentives.`,
                    potential_impact: 'Increase bookings by 20%'
                });
            }
        } else {
            analytics.recommendations.push({
                type: 'activation',
                priority: 'high',
                title: 'Enable Waitlist Feature',
                description: 'No waitlist data found. Enable waitlist to capture missed booking opportunities.',
                potential_impact: 'Capture 10-20% more bookings'
            });
        }
        
        return NextResponse.json(analytics, { status: 200 });
        
    } catch (error) {
        console.error('Error getting waitlist analytics:', error);
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