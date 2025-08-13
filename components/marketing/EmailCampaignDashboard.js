/**
 * Email Campaign Dashboard
 * 
 * React component for managing and monitoring email marketing campaigns:
 * - Create new campaigns with templates
 * - Monitor real-time campaign performance
 * - View detailed analytics and metrics
 * - Manage customer segments and templates
 * 
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

const EmailCampaignDashboard = ({ userId }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('campaigns');
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Load initial data
    useEffect(() => {
        loadDashboardData();
    }, [userId]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            
            // Load campaigns, templates, and segments in parallel
            const [campaignsRes, templatesRes, segmentsRes] = await Promise.all([
                fetch(`/api/campaigns?userId=${userId}`),
                fetch(`/api/email-templates?userId=${userId}`),
                fetch(`/api/customer-segments?userId=${userId}`)
            ]);
            
            const [campaignsData, templatesData, segmentsData] = await Promise.all([
                campaignsRes.json(),
                templatesRes.json(),
                segmentsRes.json()
            ]);
            
            setCampaigns(campaignsData.campaigns || []);
            setTemplates(templatesData.templates || []);
            setSegments(segmentsData.segments || []);
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatPercentage = (rate) => {
        return `${(rate * 100).toFixed(1)}%`;
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'completed': { variant: 'success', label: 'Completed' },
            'sending': { variant: 'warning', label: 'Sending' },
            'scheduled': { variant: 'info', label: 'Scheduled' },
            'draft': { variant: 'secondary', label: 'Draft' },
            'failed': { variant: 'destructive', label: 'Failed' }
        };
        
        const config = statusConfig[status] || { variant: 'secondary', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const CampaignMetrics = ({ campaign }) => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
                <div className="text-sm text-gray-600">Emails Sent</div>
                <div className="text-2xl font-bold text-olive-600">
                    {formatNumber(campaign.emails_sent)}
                </div>
            </Card>
            
            <Card className="p-4">
                <div className="text-sm text-gray-600">Open Rate</div>
                <div className="text-2xl font-bold text-green-600">
                    {formatPercentage(campaign.open_rate)}
                </div>
                <div className="text-xs text-gray-500">
                    {formatNumber(campaign.emails_opened)} opens
                </div>
            </Card>
            
            <Card className="p-4">
                <div className="text-sm text-gray-600">Click Rate</div>
                <div className="text-2xl font-bold text-gold-600">
                    {formatPercentage(campaign.click_rate)}
                </div>
                <div className="text-xs text-gray-500">
                    {formatNumber(campaign.emails_clicked)} clicks
                </div>
            </Card>
            
            <Card className="p-4">
                <div className="text-sm text-gray-600">Revenue</div>
                <div className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(campaign.total_charged)}
                </div>
                <div className="text-xs text-gray-500">
                    {formatCurrency(campaign.profit_margin)} profit
                </div>
            </Card>
        </div>
    );

    const CampaignsList = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Email Campaigns</h3>
                <Button onClick={() => setShowCreateModal(true)}>
                    Create Campaign
                </Button>
            </div>
            
            {campaigns.length === 0 ? (
                <Card className="p-8 text-center">
                    <div className="text-gray-500 mb-4">No campaigns yet</div>
                    <Button onClick={() => setShowCreateModal(true)}>
                        Create Your First Campaign
                    </Button>
                </Card>
            ) : (
                <div className="space-y-3">
                    {campaigns.map((campaign) => (
                        <Card 
                            key={campaign.id} 
                            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedCampaign(campaign)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-medium">{campaign.campaign_name}</h4>
                                    <p className="text-sm text-gray-600">{campaign.subject_line}</p>
                                </div>
                                {getStatusBadge(campaign.status || 'completed')}
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-600">Sent</div>
                                    <div className="font-medium">{formatNumber(campaign.emails_sent)}</div>
                                </div>
                                <div>
                                    <div className="text-gray-600">Opens</div>
                                    <div className="font-medium text-green-600">
                                        {formatPercentage(campaign.open_rate)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-600">Clicks</div>
                                    <div className="font-medium text-gold-600">
                                        {formatPercentage(campaign.click_rate)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-600">Cost</div>
                                    <div className="font-medium">{formatCurrency(campaign.total_charged)}</div>
                                </div>
                            </div>
                            
                            <div className="mt-3 text-xs text-gray-500">
                                Sent {new Date(campaign.sent_at).toLocaleDateString()} • 
                                Plan: {campaign.plan_tier.toUpperCase()} • 
                                Profit: {formatCurrency(campaign.profit_margin)}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );

    const CampaignDetails = ({ campaign }) => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">{campaign.campaign_name}</h3>
                    <p className="text-sm text-gray-600">{campaign.subject_line}</p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => setSelectedCampaign(null)}
                >
                    Back to Campaigns
                </Button>
            </div>
            
            <CampaignMetrics campaign={campaign} />
            
            <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h4 className="font-medium mb-4">Performance Breakdown</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span>Delivered</span>
                            <span>{formatNumber(campaign.emails_delivered)} ({formatPercentage(campaign.delivery_rate)})</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Bounced</span>
                            <span>{formatNumber(campaign.emails_bounced)} ({formatPercentage(campaign.bounce_rate)})</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Unsubscribed</span>
                            <span>{formatNumber(campaign.unsubscribes)} ({formatPercentage(campaign.unsubscribe_rate)})</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Spam Reports</span>
                            <span>{formatNumber(campaign.spam_reports)}</span>
                        </div>
                    </div>
                </Card>
                
                <Card className="p-6">
                    <h4 className="font-medium mb-4">Cost Analysis</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span>SendGrid Cost</span>
                            <span>{formatCurrency(campaign.sendgrid_cost)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Platform Markup</span>
                            <span>{formatCurrency(campaign.platform_markup)} ({formatPercentage(campaign.platform_markup_rate)})</span>
                        </div>
                        <div className="flex justify-between font-medium">
                            <span>Total Charged</span>
                            <span>{formatCurrency(campaign.total_charged)}</span>
                        </div>
                        <div className="flex justify-between text-green-600 font-medium">
                            <span>Profit Margin</span>
                            <span>{formatCurrency(campaign.profit_margin)}</span>
                        </div>
                    </div>
                </Card>
            </div>
            
            <Card className="p-6">
                <h4 className="font-medium mb-4">Campaign Details</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-600">From</div>
                        <div>{campaign.from_name} &lt;{campaign.from_email}&gt;</div>
                    </div>
                    <div>
                        <div className="text-gray-600">Plan Tier</div>
                        <div>{campaign.plan_tier.toUpperCase()}</div>
                    </div>
                    <div>
                        <div className="text-gray-600">Sent At</div>
                        <div>{new Date(campaign.sent_at).toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-gray-600">Completed At</div>
                        <div>
                            {campaign.completed_at 
                                ? new Date(campaign.completed_at).toLocaleString()
                                : 'In Progress'
                            }
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );

    const TemplatesList = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Email Templates</h3>
                <Button variant="outline">Create Template</Button>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                    <Card key={template.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-medium">{template.template_name}</h4>
                                <p className="text-sm text-gray-600">{template.template_type}</p>
                            </div>
                            {template.is_default && <Badge variant="secondary">Default</Badge>}
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3">{template.subject_line}</p>
                        
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Used {template.times_used} times</span>
                            <span>{new Date(template.created_at).toLocaleDateString()}</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );

    const SegmentsList = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Customer Segments</h3>
                <Button variant="outline">Create Segment</Button>
            </div>
            
            <div className="space-y-3">
                {segments.map((segment) => (
                    <Card key={segment.id} className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-medium">{segment.segment_name}</h4>
                                <p className="text-sm text-gray-600">{segment.description}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold">{formatNumber(segment.customer_count)}</div>
                                <div className="text-xs text-gray-500">customers</div>
                            </div>
                        </div>
                        
                        <div className="mt-3 flex justify-between text-xs text-gray-500">
                            <span>
                                Updated {segment.last_calculated_at 
                                    ? new Date(segment.last_calculated_at).toLocaleDateString()
                                    : 'Never'
                                }
                            </span>
                            <span>{segment.auto_update ? 'Auto-update' : 'Manual'}</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto mb-4"></div>
                    <div>Loading email campaigns...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Email Marketing</h2>
                    <p className="text-gray-600">Manage campaigns, templates, and customer segments</p>
                </div>
                
                <div className="flex space-x-2">
                    <Button variant="outline">View Analytics</Button>
                    <Button onClick={() => setShowCreateModal(true)}>
                        New Campaign
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="text-sm text-gray-600">Total Campaigns</div>
                    <div className="text-2xl font-bold">{campaigns.length}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-gray-600">Total Sent</div>
                    <div className="text-2xl font-bold">
                        {formatNumber(campaigns.reduce((sum, c) => sum + c.emails_sent, 0))}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-gray-600">Avg Open Rate</div>
                    <div className="text-2xl font-bold text-green-600">
                        {campaigns.length > 0 
                            ? formatPercentage(campaigns.reduce((sum, c) => sum + c.open_rate, 0) / campaigns.length)
                            : '0%'
                        }
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-gray-600">Total Revenue</div>
                    <div className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(campaigns.reduce((sum, c) => sum + c.total_charged, 0))}
                    </div>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'campaigns', label: 'Campaigns' },
                        { id: 'templates', label: 'Templates' },
                        { id: 'segments', label: 'Segments' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.id
                                    ? 'border-olive-500 text-olive-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div>
                {selectedCampaign ? (
                    <CampaignDetails campaign={selectedCampaign} />
                ) : (
                    <>
                        {activeTab === 'campaigns' && <CampaignsList />}
                        {activeTab === 'templates' && <TemplatesList />}
                        {activeTab === 'segments' && <SegmentsList />}
                    </>
                )}
            </div>

            {/* Create Campaign Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Create Email Campaign</h3>
                        
                        <Alert className="mb-4">
                            <div className="text-sm">
                                Campaign creation interface would go here. This includes:
                                <ul className="mt-2 list-disc list-inside space-y-1">
                                    <li>Campaign name and subject line</li>
                                    <li>Template selection or custom HTML editor</li>
                                    <li>Customer segment selection</li>
                                    <li>Personalization settings</li>
                                    <li>Schedule and send options</li>
                                </ul>
                            </div>
                        </Alert>
                        
                        <div className="flex justify-end space-x-3">
                            <Button 
                                variant="outline" 
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={() => setShowCreateModal(false)}>
                                Create Campaign
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailCampaignDashboard;