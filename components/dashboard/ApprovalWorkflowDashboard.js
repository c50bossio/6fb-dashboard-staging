/**
 * Approval Workflow Dashboard
 * Comprehensive dashboard for managing marketing automation approvals
 * Provides control and oversight for barbershop owners
 */

import React, { useState, useEffect } from 'react';
import {
  Clock, CheckCircle, XCircle, AlertCircle, Play, Pause, 
  Settings, User, Calendar, DollarSign, MessageSquare,
  TrendingUp, BarChart3, Filter, Search, Bell
} from 'lucide-react';

const ApprovalWorkflowDashboard = ({ businessId, userId }) => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Priority colors and icons
  const priorityConfig = {
    urgent: { color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' },
    high: { color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
    medium: { color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
    low: { color: 'gray', bgColor: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-200' }
  };

  // Workflow type icons and labels
  const workflowConfig = {
    marketing_campaign: { icon: TrendingUp, label: 'Marketing Campaign', color: 'blue' },
    content_creation: { icon: MessageSquare, label: 'Content Creation', color: 'green' },
    price_change: { icon: DollarSign, label: 'Price Change', color: 'yellow' },
    automation_rule: { icon: Settings, label: 'Automation Rule', color: 'purple' },
    customer_communication: { icon: User, label: 'Customer Communication', color: 'pink' }
  };

  useEffect(() => {
    fetchPendingApprovals();
    fetchAnalytics();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchPendingApprovals();
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [businessId, userId]);

  const fetchPendingApprovals = async () => {
    try {
      // Simulate API call - in production, this would call the approval workflow service
      const mockData = {
        success: true,
        pending_requests: [
          {
            request_id: "req_001",
            workflow_type: "marketing_campaign",
            title: "SMS Welcome Series Campaign",
            description: "Automated SMS welcome series for new customers with 3 messages over 7 days",
            priority: "high",
            requester_id: "system_ai",
            created_at: "2025-01-30T10:30:00",
            expires_at: "2025-01-31T10:30:00",
            hours_remaining: 18.5,
            requested_action: {
              campaign_type: "sms_sequence",
              estimated_cost: 75.00,
              target_audience_size: 150,
              ai_confidence: 0.92
            },
            metadata: {
              estimated_roi: "300%",
              channel_performance: "excellent"
            }
          },
          {
            request_id: "req_002",
            workflow_type: "content_creation",
            title: "Instagram Story Series - Weekend Specials",
            description: "AI-generated Instagram stories promoting weekend service specials",
            priority: "medium",
            requester_id: "system_ai",
            created_at: "2025-01-30T14:15:00",
            expires_at: "2025-01-31T14:15:00",
            hours_remaining: 14.2,
            requested_action: {
              content_type: "instagram_story",
              estimated_cost: 35.00,
              post_count: 6,
              ai_confidence: 0.88
            },
            metadata: {
              engagement_prediction: "high",
              brand_alignment: "excellent"
            }
          },
          {
            request_id: "req_003",
            workflow_type: "automation_rule",
            title: "Auto-Follow-Up for No-Shows",
            description: "Automated SMS follow-up sequence for customers who missed appointments",
            priority: "urgent",
            requester_id: "system_ai",
            created_at: "2025-01-30T16:45:00",
            expires_at: "2025-01-31T04:45:00",
            hours_remaining: 2.1,
            requested_action: {
              rule_type: "trigger_based",
              estimated_cost: 25.00,
              trigger_condition: "missed_appointment",
              ai_confidence: 0.95
            },
            metadata: {
              retention_impact: "high",
              customer_satisfaction: "positive"
            }
          }
        ],
        total_count: 3,
        urgent_count: 1,
        expiring_soon_count: 1
      };
      
      setPendingApprovals(mockData.pending_requests);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Simulate API call for analytics
      const mockAnalytics = {
        success: true,
        summary: {
          total_requests: 45,
          approval_rate: 87.3,
          rejection_rate: 8.9,
          auto_approval_rate: 62.2,
          pending_requests: 3,
          avg_resolution_hours: 4.2
        },
        insights: [
          {
            type: "positive",
            title: "High Approval Rate",
            description: "87.3% of requests are approved, indicating good alignment.",
            recommendation: "Consider increasing auto-approval thresholds."
          },
          {
            type: "optimization",
            title: "Auto-Approval Opportunity",
            description: "62.2% auto-approval rate suggests room for optimization.",
            recommendation: "Review criteria for routine marketing campaigns."
          }
        ]
      };
      
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleApprovalDecision = async (requestId, decision, reason = '') => {
    try {
      // Simulate API call to process approval decision
      console.log(`Processing ${decision} for request ${requestId}: ${reason}`);
      
      // Update local state optimistically
      setPendingApprovals(prev => 
        prev.filter(req => req.request_id !== requestId)
      );
      
      setSelectedRequest(null);
      
      // Show success message
      alert(`Request ${decision === 'approve' ? 'approved' : 'rejected'} successfully!`);
      
    } catch (error) {
      console.error('Failed to process approval decision:', error);
      alert('Failed to process decision. Please try again.');
    }
  };

  const getTimeRemainingColor = (hoursRemaining) => {
    if (hoursRemaining < 2) return 'text-red-600';
    if (hoursRemaining < 8) return 'text-orange-600';
    return 'text-green-600';
  };

  const formatTimeRemaining = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours < 24) return `${Math.round(hours)} hours`;
    return `${Math.round(hours / 24)} days`;
  };

  const filteredRequests = pendingApprovals.filter(request => {
    if (filter === 'all') return true;
    if (filter === 'urgent') return request.priority === 'urgent';
    if (filter === 'expiring') return request.hours_remaining < 8;
    return request.workflow_type === filter;
  });

  const ApprovalCard = ({ request }) => {
    const priorityStyle = priorityConfig[request.priority];
    const workflowStyle = workflowConfig[request.workflow_type];
    const WorkflowIcon = workflowStyle?.icon || Settings;

    return (
      <div className={`bg-white rounded-lg border-2 ${priorityStyle.borderColor} p-6 hover:shadow-lg transition-shadow cursor-pointer`}
           onClick={() => setSelectedRequest(request)}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${workflowStyle?.color || 'gray'}-100`}>
              <WorkflowIcon className={`w-5 h-5 text-${workflowStyle?.color || 'gray'}-600`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
              <p className="text-sm text-gray-600">{workflowStyle?.label}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityStyle.bgColor} ${priorityStyle.textColor}`}>
              {request.priority.toUpperCase()}
            </span>
            <Clock className={`w-4 h-4 ${getTimeRemainingColor(request.hours_remaining)}`} />
          </div>
        </div>

        <p className="text-gray-700 text-sm mb-4 line-clamp-2">{request.description}</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">${request.requested_action.estimated_cost}</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">{(request.requested_action.ai_confidence * 100).toFixed(0)}% confidence</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className={`text-sm font-medium ${getTimeRemainingColor(request.hours_remaining)}`}>
            {formatTimeRemaining(request.hours_remaining)} remaining
          </span>
          <div className="flex space-x-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleApprovalDecision(request.request_id, 'reject');
              }}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
              Reject
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleApprovalDecision(request.request_id, 'approve');
              }}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ApprovalModal = ({ request, onClose }) => {
    const [decisionReason, setDecisionReason] = useState('');
    const workflowStyle = workflowConfig[request.workflow_type];
    const WorkflowIcon = workflowStyle?.icon || Settings;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-lg bg-${workflowStyle?.color || 'gray'}-100`}>
                  <WorkflowIcon className={`w-6 h-6 text-${workflowStyle?.color || 'gray'}-600`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{request.title}</h2>
                  <p className="text-gray-600">{workflowStyle?.label}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-gray-700">{request.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Request Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Priority:</span>
                    <span className={`font-medium ${priorityConfig[request.priority].textColor}`}>
                      {request.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Cost:</span>
                    <span className="font-medium">${request.requested_action.estimated_cost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">AI Confidence:</span>
                    <span className="font-medium">{(request.requested_action.ai_confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Remaining:</span>
                    <span className={`font-medium ${getTimeRemainingColor(request.hours_remaining)}`}>
                      {formatTimeRemaining(request.hours_remaining)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Expected Impact</h4>
                <div className="space-y-2 text-sm">
                  {request.metadata.estimated_roi && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">ROI:</span>
                      <span className="font-medium text-green-600">{request.metadata.estimated_roi}</span>
                    </div>
                  )}
                  {request.metadata.channel_performance && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Performance:</span>
                      <span className="font-medium">{request.metadata.channel_performance}</span>
                    </div>
                  )}
                  {request.requested_action.target_audience_size && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reach:</span>
                      <span className="font-medium">{request.requested_action.target_audience_size} customers</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Action Details</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(request.requested_action, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision Reason (Optional)
              </label>
              <textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Add a reason for your decision..."
              />
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleApprovalDecision(request.request_id, 'reject', decisionReason);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
            <button
              onClick={() => {
                handleApprovalDecision(request.request_id, 'approve', decisionReason);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Approval Center</h1>
            <p className="text-gray-600 mt-1">Review and manage marketing automation requests</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-orange-600 font-medium">
                {pendingApprovals.filter(r => r.hours_remaining < 8).length} expiring soon
              </span>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.summary.pending_requests}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                <p className="text-2xl font-bold text-green-600">{analytics.summary.approval_rate}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Auto-Approved</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.summary.auto_approval_rate}%</p>
              </div>
              <Play className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.summary.avg_resolution_hours}h</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === 'all' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({pendingApprovals.length})
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === 'urgent' 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Urgent ({pendingApprovals.filter(r => r.priority === 'urgent').length})
            </button>
            <button
              onClick={() => setFilter('expiring')}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === 'expiring' 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Expiring Soon ({pendingApprovals.filter(r => r.hours_remaining < 8).length})
            </button>
            <button
              onClick={() => setFilter('marketing_campaign')}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === 'marketing_campaign' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Campaigns ({pendingApprovals.filter(r => r.workflow_type === 'marketing_campaign').length})
            </button>
          </div>
        </div>
      </div>

      {/* Approval Requests */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600">No pending approval requests at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRequests.map((request) => (
              <ApprovalCard key={request.request_id} request={request} />
            ))}
          </div>
        )}
      </div>

      {/* Insights */}
      {analytics?.insights && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights & Recommendations</h3>
          <div className="space-y-4">
            {analytics.insights.map((insight, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                insight.type === 'positive' ? 'bg-green-50 border-green-400' :
                insight.type === 'optimization' ? 'bg-blue-50 border-blue-400' :
                'bg-yellow-50 border-yellow-400'
              }`}>
                <h4 className="font-medium text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                <p className="text-sm font-medium text-gray-700 mt-2">💡 {insight.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedRequest && (
        <ApprovalModal 
          request={selectedRequest} 
          onClose={() => setSelectedRequest(null)} 
        />
      )}
    </div>
  );
};

export default ApprovalWorkflowDashboard;