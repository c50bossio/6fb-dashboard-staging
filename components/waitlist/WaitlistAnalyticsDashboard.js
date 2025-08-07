'use client';

import React, { useState, useEffect } from 'react';

import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const WaitlistAnalyticsDashboard = ({ barbershopId }) => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dateRange, setDateRange] = useState('30'); // days
    const [refreshing, setRefreshing] = useState(false);
    
    const fetchAnalytics = async () => {
        try {
            setRefreshing(true);
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const response = await fetch(`/api/waitlist/analytics?barbershop_id=${barbershopId || 'demo_barbershop'}&start_date=${startDate}&end_date=${endDate}`);
            const data = await response.json();
            
            if (data.success) {
                setAnalytics(data);
                setError('');
            } else {
                setError(data.error || 'Failed to load analytics');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    
    useEffect(() => {
        fetchAnalytics();
    }, [barbershopId, dateRange]);
    
    const MetricCard = ({ title, value, subtitle, trend, icon, color = 'text-blue-600' }) => (
        <Card>
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">{title}</p>
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                        {subtitle && (
                            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                        )}
                        {trend && (
                            <div className={`text-sm mt-2 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
                                {trend.positive ? '↗️' : '↘️'} {trend.text}
                            </div>
                        )}
                    </div>
                    <div className={`text-3xl ${color}`}>
                        {icon}
                    </div>
                </div>
            </div>
        </Card>
    );
    
    const ServiceCard = ({ service }) => (
        <Card>
            <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">{service.service_name}</h3>
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {service.percentage.toFixed(1)}%
                    </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                        <span>Requests:</span>
                        <span>{service.count}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Avg wait:</span>
                        <span>{service.avg_wait_time_hours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Conversion:</span>
                        <span className={service.conversion_rate >= 70 ? 'text-green-600' : service.conversion_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                            {service.conversion_rate.toFixed(1)}%
                        </span>
                    </div>
                </div>
                {/* Progress bar for conversion rate */}
                <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className={`h-2 rounded-full ${
                                service.conversion_rate >= 70 ? 'bg-green-500' :
                                service.conversion_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${service.conversion_rate}%` }}
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
    
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Waitlist Analytics</h2>
                </div>
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading analytics...</span>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Waitlist Analytics</h2>
                </div>
                <Card>
                    <div className="p-8 text-center">
                        <div className="text-red-600 mb-4">
                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Analytics</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button onClick={fetchAnalytics}>Try Again</Button>
                    </div>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Waitlist Analytics</h2>
                    <p className="text-gray-600">
                        {analytics?.period && `${analytics.period.start_date} to ${analytics.period.end_date} (${analytics.period.days} days)`}
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2"
                    >
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                    </select>
                    <Button
                        variant="outline"
                        onClick={fetchAnalytics}
                        disabled={refreshing}
                        className="flex items-center space-x-2"
                    >
                        <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Waitlist Entries"
                    value={analytics?.waitlist_stats?.total_entries || 0}
                    subtitle={`${analytics?.waitlist_stats?.current_waitlist_size || 0} currently active`}
                    icon="📋"
                    color="text-blue-600"
                    trend={analytics?.trends?.weekly_comparison && {
                        positive: analytics.trends.weekly_comparison.this_week.entries >= analytics.trends.weekly_comparison.last_week.entries,
                        text: `${Math.abs(((analytics.trends.weekly_comparison.this_week.entries - analytics.trends.weekly_comparison.last_week.entries) / Math.max(analytics.trends.weekly_comparison.last_week.entries, 1) * 100)).toFixed(1)}% vs last week`
                    }}
                />
                
                <MetricCard
                    title="Successful Matches"
                    value={analytics?.waitlist_stats?.successful_matches || 0}
                    subtitle={`${analytics?.waitlist_stats?.conversion_rate_percent || 0}% conversion rate`}
                    icon="✅"
                    color="text-green-600"
                    trend={analytics?.trends?.weekly_comparison && {
                        positive: analytics.trends.weekly_comparison.this_week.conversion >= analytics.trends.weekly_comparison.last_week.conversion,
                        text: `${(analytics.trends.weekly_comparison.change_percent || 0).toFixed(1)}% change`
                    }}
                />
                
                <MetricCard
                    title="Avg Wait Time"
                    value={`${analytics?.waitlist_stats?.average_wait_time_hours || 0}h`}
                    subtitle="Average time in queue"
                    icon="⏱️"
                    color="text-yellow-600"
                />
                
                <MetricCard
                    title="Revenue Generated"
                    value={`$${analytics?.waitlist_stats?.revenue_from_waitlist || 0}`}
                    subtitle="From waitlist conversions"
                    icon="💰"
                    color="text-purple-600"
                    trend={analytics?.trends?.monthly_growth && {
                        positive: analytics.trends.monthly_growth.revenue_growth > 0,
                        text: `${analytics.trends.monthly_growth.revenue_growth.toFixed(1)}% monthly growth`
                    }}
                />
            </div>
            
            {/* Cancellation Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Cancellations"
                    value={analytics?.cancellation_stats?.total_cancellations || 0}
                    subtitle="This period"
                    icon="❌"
                    color="text-red-600"
                />
                
                <MetricCard
                    title="Total Refunds"
                    value={`$${analytics?.cancellation_stats?.total_refunds || 0}`}
                    subtitle={`$${analytics?.cancellation_stats?.average_cancellation_fee || 0} avg fee`}
                    icon="💸"
                    color="text-orange-600"
                />
                
                <MetricCard
                    title="Customer Satisfaction"
                    value={analytics?.performance_insights?.customer_satisfaction_score || 0}
                    subtitle="Out of 5 stars"
                    icon="⭐"
                    color="text-yellow-500"
                    trend={analytics?.trends?.monthly_growth && {
                        positive: analytics.trends.monthly_growth.customer_satisfaction_trend === 'improving',
                        text: analytics.trends.monthly_growth.customer_satisfaction_trend || 'stable'
                    }}
                />
            </div>
            
            {/* Peak Times */}
            {analytics?.performance_insights && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Peak Waitlist Hours</h3>
                            <div className="space-y-3">
                                {analytics.performance_insights.peak_waitlist_hours.map((hour, index) => (
                                    <div key={hour.hour} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <span className="font-medium">{index + 1}.</span>
                                            <span>{hour.hour}:00</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm text-gray-600">{hour.count} entries</span>
                                            <span className="text-sm font-medium">{hour.percentage.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                    
                    <Card>
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Peak Waitlist Days</h3>
                            <div className="space-y-3">
                                {analytics.performance_insights.peak_waitlist_days.map((day, index) => (
                                    <div key={day.day} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <span className="font-medium">{index + 1}.</span>
                                            <span>{day.day}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm text-gray-600">{day.count} entries</span>
                                            <span className="text-sm font-medium">{day.percentage.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>
            )}
            
            {/* Most Requested Services */}
            {analytics?.performance_insights?.most_requested_services && (
                <Card>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-6">Most Requested Services</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {analytics.performance_insights.most_requested_services.map((service, index) => (
                                <ServiceCard key={service.service_id} service={service} />
                            ))}
                        </div>
                    </div>
                </Card>
            )}
            
            {/* Performance Insights */}
            {analytics?.performance_insights && (
                <Card>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{analytics.performance_insights.notification_response_rate.toFixed(1)}%</div>
                                <div className="text-gray-600">Notification Response Rate</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{analytics.performance_insights.average_response_time_minutes}</div>
                                <div className="text-gray-600">Avg Response Time (min)</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{analytics.performance_insights.repeat_waitlist_customers}</div>
                                <div className="text-gray-600">Repeat Customers</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">{analytics.waitlist_stats.average_position_at_booking?.toFixed(1) || 'N/A'}</div>
                                <div className="text-gray-600">Avg Position at Booking</div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
            
            {/* AI Recommendations */}
            {analytics?.recommendations && analytics.recommendations.length > 0 && (
                <Card>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
                        <div className="space-y-4">
                            {analytics.recommendations.map((rec, index) => (
                                <div key={index} className="border-l-4 border-blue-500 pl-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold">{rec.title}</h4>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {rec.priority} priority
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm mb-2">{rec.description}</p>
                                    <div className="text-blue-600 text-sm font-medium">
                                        💡 {rec.potential_impact}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default WaitlistAnalyticsDashboard;