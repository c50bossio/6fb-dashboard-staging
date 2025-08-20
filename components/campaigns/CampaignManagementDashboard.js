/**
 * Campaign Management Dashboard
 * Complete campaign creation, execution, and performance tracking
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Loading } from '../ui/Loading';
import { StatsCard } from '../ui/StatsCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// Icons (you can replace with your preferred icon library)
const Icons = {
  Plus: () => <span>+</span>,
  Play: () => <span>▶</span>,
  Pause: () => <span>⏸</span>,
  Edit: () => <span>✏️</span>,
  Delete: () => <span>🗑️</span>,
  Test: () => <span>🧪</span>,
  Email: () => <span>📧</span>,
  SMS: () => <span>📱</span>,
  Chart: () => <span>📊</span>,
  Calendar: () => <span>📅</span>,
  Users: () => <span>👥</span>,
  Target: () => <span>🎯</span>,
  Success: () => <span>✅</span>,
  Warning: () => <span>⚠️</span>,
  Error: () => <span>❌</span>
};

const CampaignManagementDashboard = () => {
  // State management
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  
  // Form states
  const [createForm, setCreateForm] = useState({
    campaign_name: '',
    campaign_description: '',
    campaign_type: 'email',
    campaign_category: 'promotional',
    target_segments: [],
    channels: {
      email: {
        subject: '',
        message: '',
        personalization: true
      }
    },
    trigger_type: 'manual',
    primary_goal: 'increase_bookings'
  });
  
  const [testForm, setTestForm] = useState({
    campaign_definition_id: '',
    test_email: '',
    test_phone: '',
    channel: 'email'
  });

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCampaigns(),
        loadTemplates(),
        loadSegments()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch('/api/customers/campaigns', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load campaigns');
      
      const data = await response.json();
      setCampaigns(data.data?.campaigns || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      throw error;
    }
  };

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch('/api/customers/campaigns/templates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load templates');
      
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      throw error;
    }
  };

  const loadSegments = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch('/api/customers/analytics/segments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load segments');
      
      const data = await response.json();
      setSegments(data.data || []);
    } catch (error) {
      console.error('Error loading segments:', error);
      // Don't throw here as segments might not be available
      setSegments([]);
    }
  };

  const createCampaign = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch('/api/customers/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create campaign');
      }
      
      const data = await response.json();
      
      // Refresh campaigns list
      await loadCampaigns();
      
      // Close modal and reset form
      setShowCreateModal(false);
      setCreateForm({
        campaign_name: '',
        campaign_description: '',
        campaign_type: 'email',
        campaign_category: 'promotional',
        target_segments: [],
        channels: {
          email: {
            subject: '',
            message: '',
            personalization: true
          }
        },
        trigger_type: 'manual',
        primary_goal: 'increase_bookings'
      });
      
      alert('Campaign created successfully!');
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert(`Failed to create campaign: ${error.message}`);
    }
  };

  const executeCampaign = async (campaignId) => {
    try {
      const token = localStorage.getItem('supabase_token');
      const executionData = {
        campaign_definition_id: campaignId,
        execution_name: `Execution ${new Date().toLocaleDateString()}`,
        execution_type: 'standard'
      };
      
      const response = await fetch('/api/customers/campaigns/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          execution_data: executionData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to execute campaign');
      }
      
      const data = await response.json();
      
      // Refresh campaigns list
      await loadCampaigns();
      
      alert('Campaign execution started successfully!');
    } catch (error) {
      console.error('Error executing campaign:', error);
      alert(`Failed to execute campaign: ${error.message}`);
    }
  };

  const pauseResumeCampaign = async (campaignId, action) => {
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch('/api/customers/campaigns/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          action: action
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `Failed to ${action} campaign`);
      }
      
      // Refresh campaigns list
      await loadCampaigns();
      
      alert(`Campaign ${action}d successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error);
      alert(`Failed to ${action} campaign: ${error.message}`);
    }
  };

  const sendTestCampaign = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch('/api/customers/campaigns/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testForm)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to send test campaign');
      }
      
      setShowTestModal(false);
      setTestForm({
        campaign_definition_id: '',
        test_email: '',
        test_phone: '',
        channel: 'email'
      });
      
      alert('Test campaign sent successfully!');
    } catch (error) {
      console.error('Error sending test campaign:', error);
      alert(`Failed to send test campaign: ${error.message}`);
    }
  };

  const setupAutomatedCampaigns = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch('/api/customers/campaigns/automated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaign_types: ['welcome', 'birthday', 'win_back'],
          welcome_series_config: {},
          birthday_config: {},
          win_back_config: {}
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to setup automated campaigns');
      }
      
      // Refresh campaigns list
      await loadCampaigns();
      
      alert('Automated campaigns set up successfully!');
    } catch (error) {
      console.error('Error setting up automated campaigns:', error);
      alert(`Failed to setup automated campaigns: ${error.message}`);
    }
  };

  const getCampaignStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-600';
      case 'completed': return 'text-blue-600';
      case 'paused': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  };

  const getCampaignTypeIcon = (type) => {
    switch (type) {
      case 'email': return <Icons.Email />;
      case 'sms': return <Icons.SMS />;
      case 'multi_channel': return <span>📧📱</span>;
      default: return <Icons.Email />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <Icons.Error />
            <span className="text-red-700">{error}</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
          <p className="text-gray-600">Create, execute, and track your customer campaigns</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Icons.Plus />
            Create Campaign
          </Button>
          <Button
            onClick={setupAutomatedCampaigns}
            variant="outline"
          >
            Setup Automated Campaigns
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Campaigns"
          value={campaigns.length}
          icon={<Icons.Target />}
        />
        <StatsCard
          title="Active Campaigns"
          value={campaigns.filter(c => c.is_active).length}
          icon={<Icons.Play />}
          className="text-green-600"
        />
        <StatsCard
          title="Templates Available"
          value={templates.length}
          icon={<Icons.Email />}
        />
        <StatsCard
          title="Customer Segments"
          value={segments.length}
          icon={<Icons.Users />}
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Your Campaigns</h3>
                <Button
                  onClick={() => setShowTestModal(true)}
                  variant="outline"
                  size="sm"
                >
                  <Icons.Test />
                  Send Test
                </Button>
              </div>
              
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Icons.Target />
                  <h4 className="text-lg font-medium text-gray-900 mt-2">No campaigns yet</h4>
                  <p className="text-gray-600">Create your first campaign to start engaging customers</p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4"
                  >
                    Create Your First Campaign
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {campaigns.map((campaign) => (
                    <Card key={campaign.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {getCampaignTypeIcon(campaign.campaign_type)}
                            <h4 className="font-medium">{campaign.campaign_name}</h4>
                            <span className={`text-sm ${getCampaignStatusColor(campaign.is_active ? 'active' : 'inactive')}`}>
                              {campaign.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mt-1">{campaign.campaign_description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>Type: {campaign.campaign_type}</span>
                            <span>Category: {campaign.campaign_category}</span>
                            <span>Goal: {campaign.primary_goal}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => executeCampaign(campaign.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Icons.Play />
                            Execute
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowPerformanceModal(true);
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <Icons.Chart />
                            Performance
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Campaign Templates</h3>
            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="p-4 border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-gray-600 text-sm">{template.category} • {template.type}</p>
                      <div className="mt-2">
                        <span className="text-sm text-gray-500">Variables: </span>
                        <span className="text-sm">{template.variables.join(', ')}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setCreateForm({
                          ...createForm,
                          campaign_name: template.name,
                          campaign_category: template.category,
                          campaign_type: template.type,
                          channels: {
                            [template.type]: {
                              subject: template.subject || '',
                              message: template.content,
                              personalization: true
                            }
                          }
                        });
                        setShowCreateModal(true);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Use Template
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Campaign Analytics</h3>
            <div className="text-center py-8">
              <Icons.Chart />
              <p className="text-gray-600 mt-2">Select a campaign to view detailed analytics</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Campaign"
        size="large"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Name
              </label>
              <input
                type="text"
                value={createForm.campaign_name}
                onChange={(e) => setCreateForm({...createForm, campaign_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter campaign name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Type
              </label>
              <select
                value={createForm.campaign_type}
                onChange={(e) => setCreateForm({...createForm, campaign_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="multi_channel">Multi-Channel</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={createForm.campaign_description}
              onChange={(e) => setCreateForm({...createForm, campaign_description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe your campaign..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={createForm.campaign_category}
                onChange={(e) => setCreateForm({...createForm, campaign_category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="promotional">Promotional</option>
                <option value="retention">Retention</option>
                <option value="reactivation">Reactivation</option>
                <option value="nurture">Nurture</option>
                <option value="welcome">Welcome</option>
                <option value="birthday">Birthday</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Goal
              </label>
              <select
                value={createForm.primary_goal}
                onChange={(e) => setCreateForm({...createForm, primary_goal: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="increase_bookings">Increase Bookings</option>
                <option value="reduce_churn">Reduce Churn</option>
                <option value="customer_retention">Customer Retention</option>
                <option value="upsell">Upsell Services</option>
              </select>
            </div>
          </div>

          {createForm.campaign_type === 'email' && (
            <div className="space-y-3">
              <h4 className="font-medium">Email Content</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={createForm.channels.email?.subject || ''}
                  onChange={(e) => setCreateForm({
                    ...createForm,
                    channels: {
                      ...createForm.channels,
                      email: {
                        ...createForm.channels.email,
                        subject: e.target.value
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Content
                </label>
                <textarea
                  value={createForm.channels.email?.message || ''}
                  onChange={(e) => setCreateForm({
                    ...createForm,
                    channels: {
                      ...createForm.channels,
                      email: {
                        ...createForm.channels.email,
                        message: e.target.value
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  placeholder="Enter email content... Use {{customer_first_name}} for personalization"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => setShowCreateModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={createCampaign}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Campaign
            </Button>
          </div>
        </div>
      </Modal>

      {/* Test Campaign Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Send Test Campaign"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Campaign
            </label>
            <select
              value={testForm.campaign_definition_id}
              onChange={(e) => setTestForm({...testForm, campaign_definition_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.campaign_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel
            </label>
            <select
              value={testForm.channel}
              onChange={(e) => setTestForm({...testForm, channel: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>

          {testForm.channel === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Email Address
              </label>
              <input
                type="email"
                value={testForm.test_email}
                onChange={(e) => setTestForm({...testForm, test_email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="test@example.com"
              />
            </div>
          )}

          {testForm.channel === 'sms' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Phone Number
              </label>
              <input
                type="tel"
                value={testForm.test_phone}
                onChange={(e) => setTestForm({...testForm, test_phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1234567890"
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => setShowTestModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={sendTestCampaign}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Send Test
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CampaignManagementDashboard;