/**
 * ROI Tracking Dashboard - Marketing Automation Performance Analytics
 * Comprehensive dashboard showing cost savings and revenue impact across all marketing channels
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Target,
  MessageSquare, Mail, Globe, Star, ThumbsUp, Calendar,
  ArrowUp, ArrowDown, AlertCircle, CheckCircle
} from 'lucide-react';

const ROITrackingDashboard = ({ businessId }) => {
  const [roiData, setRoiData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Colors for consistent theming
  const colors = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    teal: '#14B8A6'
  };

  useEffect(() => {
    fetchROIData();
  }, [businessId, selectedTimeframe]);

  const fetchROIData = async () => {
    setLoading(true);
    try {
      // Simulate API call - in production, this would fetch real data
      const mockData = {
        overview: {
          totalInvestment: 253.00,
          totalRevenue: 8420.00,
          netProfit: 8167.00,
          roiPercentage: 3223,
          competitorSavings: 297.00,
          revenueGrowth: 34.2,
          customerAcquisition: 42,
          retentionImprovement: 18.5
        },
        channels: {
          smsMarketing: {
            investment: 51.00,
            revenue: 1850.00,
            roi: 3527,
            messagessent: 847,
            responseRate: 45.2,
            bookingsGenerated: 28,
            status: 'excellent'
          },
          emailMarketing: {
            investment: 29.00,
            revenue: 1240.00,
            roi: 4276,
            emailsSent: 2456,
            openRate: 22.8,
            clickRate: 3.4,
            bookingsGenerated: 18,
            status: 'excellent'
          },
          gmbAutomation: {
            investment: 49.00,
            revenue: 2180.00,
            roi: 4449,
            postsCreated: 16,
            reviewsResponded: 23,
            searchVisibility: '+28%',
            bookingsGenerated: 31,
            status: 'excellent'
          },
          socialMedia: {
            investment: 69.00,
            revenue: 1620.00,
            roi: 2348,
            postsCreated: 24,
            engagement: '+42%',
            reach: 3420,
            bookingsGenerated: 19,
            status: 'good'
          },
          reviewManagement: {
            investment: 45.00,
            revenue: 980.00,
            roi: 2078,
            reviewsMonitored: 34,
            responseRate: 100,
            ratingImprovement: '+0.3',
            trustIncrease: '+15%',
            status: 'good'
          },
          websiteGeneration: {
            investment: 226.00, // Including setup fee
            revenue: 550.00,
            roi: 143,
            websitesGenerated: 1,
            trafficIncrease: '+67%',
            conversionRate: 4.2,
            bookingsGenerated: 8,
            status: 'developing'
          }
        },
        monthlyTrends: [
          { month: 'Month 1', investment: 226, revenue: 420, netProfit: 194, roi: 86 },
          { month: 'Month 2', investment: 253, revenue: 2840, netProfit: 2587, roi: 1022 },
          { month: 'Month 3', investment: 253, revenue: 5680, netProfit: 5427, roi: 2144 },
          { month: 'Month 4', investment: 253, revenue: 8420, netProfit: 8167, roi: 3223 }
        ],
        competitorComparison: {
          traditional: {
            sms: 57.00,
            email: 40.00,
            gmb: 79.00,
            social: 135.00,
            reviews: 79.00,
            website: 299.00,
            total: 689.00
          },
          ourPricing: {
            sms: 51.00,
            email: 29.00,
            gmb: 49.00,
            social: 69.00,
            reviews: 45.00,
            website: 29.00, // Monthly after setup
            total: 272.00
          },
          savings: {
            monthly: 417.00,
            annual: 5004.00,
            percentage: 60.5
          }
        },
        customerMetrics: {
          acquisitionCost: 18.50,
          lifetimeValue: 847.00,
          retentionRate: 84.3,
          satisfactionScore: 4.7,
          referralRate: 23.8,
          bookingFrequency: 3.2
        }
      };

      // Simulate loading delay
      setTimeout(() => {
        setRoiData(mockData);
        setLoading(false);
      }, 1000);

    } catch (error) {
      console.error('Failed to fetch ROI data:', error);
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, change, icon: Icon, color, prefix = '', suffix = '' }) => (
    <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">
      <div className=\"flex items-center justify-between\">
        <div>
          <p className=\"text-sm font-medium text-gray-600\">{title}</p>
          <p className=\"text-2xl font-bold text-gray-900\">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? <ArrowUp className=\"w-4 h-4 mr-1\" /> : <ArrowDown className=\"w-4 h-4 mr-1\" />}
              <span>{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const ChannelCard = ({ name, data, icon: Icon }) => {
    const getStatusColor = (status) => {
      const statusColors = {
        excellent: 'green',
        good: 'blue',
        developing: 'yellow',
        needs_attention: 'red'
      };
      return statusColors[status] || 'gray';
    };

    const statusColor = getStatusColor(data.status);

    return (
      <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">
        <div className=\"flex items-center justify-between mb-4\">
          <div className=\"flex items-center\">
            <Icon className=\"w-5 h-5 text-gray-600 mr-2\" />
            <h3 className=\"text-lg font-semibold text-gray-900\">{name}</h3>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${statusColor}-100 text-${statusColor}-800`}>
            {data.status.replace('_', ' ')}
          </span>
        </div>
        
        <div className=\"grid grid-cols-2 gap-4 mb-4\">
          <div>
            <p className=\"text-sm text-gray-600\">Investment</p>
            <p className=\"text-xl font-bold text-gray-900\">${data.investment}</p>
          </div>
          <div>
            <p className=\"text-sm text-gray-600\">Revenue</p>
            <p className=\"text-xl font-bold text-green-600\">${data.revenue.toLocaleString()}</p>
          </div>
        </div>
        
        <div className=\"grid grid-cols-2 gap-4 text-sm\">
          <div>
            <p className=\"text-gray-600\">ROI</p>
            <p className=\"font-semibold text-green-600\">{data.roi.toLocaleString()}%</p>
          </div>
          <div>
            <p className=\"text-gray-600\">Bookings</p>
            <p className=\"font-semibold text-blue-600\">{data.bookingsGenerated || 'N/A'}</p>
          </div>
        </div>
        
        {/* Channel-specific metrics */}
        <div className=\"mt-4 pt-4 border-t border-gray-100\">
          <div className=\"grid grid-cols-2 gap-2 text-sm\">
            {data.messagesLent && (
              <>
                <span className=\"text-gray-600\">Messages:</span>
                <span className=\"font-medium\">{data.messagesSent}</span>
              </>
            )}
            {data.emailsSent && (
              <>
                <span className=\"text-gray-600\">Emails:</span>
                <span className=\"font-medium\">{data.emailsSent.toLocaleString()}</span>
              </>
            )}
            {data.postsCreated && (
              <>
                <span className=\"text-gray-600\">Posts:</span>
                <span className=\"font-medium\">{data.postsCreated}</span>
              </>
            )}
            {data.reviewsMonitored && (
              <>
                <span className=\"text-gray-600\">Reviews:</span>
                <span className=\"font-medium\">{data.reviewsMonitored}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const CompetitorComparisonChart = ({ data }) => {
    const comparisonData = [
      { service: 'SMS', traditional: data.traditional.sms, ours: data.ourPricing.sms },
      { service: 'Email', traditional: data.traditional.email, ours: data.ourPricing.email },
      { service: 'GMB', traditional: data.traditional.gmb, ours: data.ourPricing.gmb },
      { service: 'Social', traditional: data.traditional.social, ours: data.ourPricing.social },
      { service: 'Reviews', traditional: data.traditional.reviews, ours: data.ourPricing.reviews },
      { service: 'Website', traditional: data.traditional.website, ours: data.ourPricing.website }
    ];

    return (
      <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">
        <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">Cost Comparison vs Competitors</h3>
        
        <div className=\"mb-6 grid grid-cols-3 gap-4 text-center\">
          <div className=\"bg-red-50 rounded-lg p-4\">
            <p className=\"text-sm text-gray-600\">Traditional Cost</p>
            <p className=\"text-2xl font-bold text-red-600\">${data.traditional.total}</p>
            <p className=\"text-xs text-gray-500\">per month</p>
          </div>
          <div className=\"bg-green-50 rounded-lg p-4\">
            <p className=\"text-sm text-gray-600\">Our Cost</p>
            <p className=\"text-2xl font-bold text-green-600\">${data.ourPricing.total}</p>
            <p className=\"text-xs text-gray-500\">per month</p>
          </div>
          <div className=\"bg-blue-50 rounded-lg p-4\">
            <p className=\"text-sm text-gray-600\">Savings</p>
            <p className=\"text-2xl font-bold text-blue-600\">{data.savings.percentage}%</p>
            <p className=\"text-xs text-gray-500\">${data.savings.monthly}/month</p>
          </div>
        </div>

        <ResponsiveContainer width=\"100%\" height={300}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray=\"3 3\" />
            <XAxis dataKey=\"service\" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey=\"traditional\" fill=\"#EF4444\" name=\"Traditional Pricing\" />
            <Bar dataKey=\"ours\" fill=\"#10B981\" name=\"Our Pricing\" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const ROITrendChart = ({ data }) => (
    <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">
      <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">ROI Growth Trend</h3>
      <ResponsiveContainer width=\"100%\" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray=\"3 3\" />
          <XAxis dataKey=\"month\" />
          <YAxis />
          <Tooltip formatter={(value, name) => {
            if (name === 'roi') return [`${value}%`, 'ROI'];
            return [`$${value}`, name === 'investment' ? 'Investment' : name === 'revenue' ? 'Revenue' : 'Net Profit'];
          }} />
          <Legend />
          <Area type=\"monotone\" dataKey=\"investment\" stackId=\"1\" stroke={colors.danger} fill={colors.danger} fillOpacity={0.6} />
          <Area type=\"monotone\" dataKey=\"netProfit\" stackId=\"2\" stroke={colors.success} fill={colors.success} fillOpacity={0.6} />
          <Line type=\"monotone\" dataKey=\"roi\" stroke={colors.primary} strokeWidth={3} dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600\"></div>
      </div>
    );
  }

  if (!roiData) {
    return (
      <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center\">
        <AlertCircle className=\"w-12 h-12 text-gray-400 mx-auto mb-4\" />
        <h3 className=\"text-lg font-medium text-gray-900 mb-2\">No Data Available</h3>
        <p className=\"text-gray-600\">Start using marketing automation to see ROI analytics here.</p>
      </div>
    );
  }

  return (
    <div className=\"space-y-6\">
      {/* Header */}
      <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">
        <div className=\"flex justify-between items-start\">
          <div>
            <h1 className=\"text-2xl font-bold text-gray-900\">Marketing ROI Dashboard</h1>
            <p className=\"text-gray-600 mt-1\">Comprehensive analytics for your marketing automation investment</p>
          </div>
          <div className=\"flex space-x-2\">
            {['7d', '30d', '90d', '1y'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedTimeframe(period)}
                className={`px-3 py-1 text-sm rounded-md ${
                  selectedTimeframe === period
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6\">
        <MetricCard
          title=\"Total Investment\"
          value={roiData.overview.totalInvestment}
          prefix=\"$\"
          icon={DollarSign}
          color=\"blue\"
        />
        <MetricCard
          title=\"Revenue Generated\"
          value={roiData.overview.totalRevenue}
          prefix=\"$\"
          change={roiData.overview.revenueGrowth}
          icon={TrendingUp}
          color=\"green\"
        />
        <MetricCard
          title=\"Net Profit\"
          value={roiData.overview.netProfit}
          prefix=\"$\"
          icon={Target}
          color=\"purple\"
        />
        <MetricCard
          title=\"ROI\"
          value={roiData.overview.roiPercentage}
          suffix=\"%\"
          icon={ArrowUp}
          color=\"green\"
        />
      </div>

      {/* Key Performance Indicators */}
      <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">
        <MetricCard
          title=\"Monthly Savings vs Competitors\"
          value={roiData.overview.competitorSavings}
          prefix=\"$\"
          icon={CheckCircle}
          color=\"teal\"
        />
        <MetricCard
          title=\"New Customers Acquired\"
          value={roiData.overview.customerAcquisition}
          icon={Users}
          color=\"blue\"
        />
        <MetricCard
          title=\"Retention Improvement\"
          value={roiData.overview.retentionImprovement}
          suffix=\"%\"
          icon={ThumbsUp}
          color=\"green\"
        />
      </div>

      {/* Navigation Tabs */}
      <div className=\"bg-white rounded-lg shadow-sm border border-gray-200\">
        <div className=\"border-b border-gray-200\">
          <nav className=\"flex space-x-8 px-6\">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'channels', label: 'Channel Performance', icon: Target },
              { id: 'comparison', label: 'Cost Comparison', icon: DollarSign },
              { id: 'trends', label: 'Trends', icon: BarChart }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className=\"w-4 h-4 mr-2\" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className=\"p-6\">
          {activeTab === 'overview' && (
            <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
              <ROITrendChart data={roiData.monthlyTrends} />
              <div className=\"bg-gray-50 rounded-lg p-6\">
                <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">Performance Summary</h3>
                <div className=\"space-y-4\">
                  <div className=\"flex justify-between items-center\">
                    <span className=\"text-gray-600\">Average Customer Acquisition Cost</span>
                    <span className=\"font-semibold\">${roiData.customerMetrics.acquisitionCost}</span>
                  </div>
                  <div className=\"flex justify-between items-center\">
                    <span className=\"text-gray-600\">Customer Lifetime Value</span>
                    <span className=\"font-semibold\">${roiData.customerMetrics.lifetimeValue}</span>
                  </div>
                  <div className=\"flex justify-between items-center\">
                    <span className=\"text-gray-600\">Customer Satisfaction</span>
                    <span className=\"font-semibold\">{roiData.customerMetrics.satisfactionScore}/5.0</span>
                  </div>
                  <div className=\"flex justify-between items-center\">
                    <span className=\"text-gray-600\">Referral Rate</span>
                    <span className=\"font-semibold\">{roiData.customerMetrics.referralRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'channels' && (
            <div className=\"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6\">
              <ChannelCard name=\"SMS Marketing\" data={roiData.channels.smsMarketing} icon={MessageSquare} />
              <ChannelCard name=\"Email Marketing\" data={roiData.channels.emailMarketing} icon={Mail} />
              <ChannelCard name=\"GMB Automation\" data={roiData.channels.gmbAutomation} icon={Star} />
              <ChannelCard name=\"Social Media\" data={roiData.channels.socialMedia} icon={ThumbsUp} />
              <ChannelCard name=\"Review Management\" data={roiData.channels.reviewManagement} icon={Star} />
              <ChannelCard name=\"Website Generation\" data={roiData.channels.websiteGeneration} icon={Globe} />
            </div>
          )}

          {activeTab === 'comparison' && (
            <CompetitorComparisonChart data={roiData.competitorComparison} />
          )}

          {activeTab === 'trends' && (
            <div className=\"space-y-6\">
              <ROITrendChart data={roiData.monthlyTrends} />
              <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">
                <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">Growth Projections</h3>
                <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">
                  <div className=\"text-center\">
                    <p className=\"text-2xl font-bold text-blue-600\">12.4K</p>
                    <p className=\"text-sm text-gray-600\">Projected 6-month revenue</p>
                  </div>
                  <div className=\"text-center\">
                    <p className=\"text-2xl font-bold text-green-600\">+85%</p>
                    <p className=\"text-sm text-gray-600\">Expected ROI improvement</p>
                  </div>
                  <div className=\"text-center\">
                    <p className=\"text-2xl font-bold text-purple-600\">3.2x</p>
                    <p className=\"text-sm text-gray-600\">Revenue multiplier potential</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Items */}
      <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">
        <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">Recommended Actions</h3>
        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
          <div className=\"bg-green-50 border border-green-200 rounded-lg p-4\">
            <h4 className=\"font-medium text-green-800 mb-2\">Scale Successful Channels</h4>
            <p className=\"text-sm text-green-700\">
              SMS and Email marketing are showing exceptional ROI. Consider increasing budget allocation.
            </p>
          </div>
          <div className=\"bg-blue-50 border border-blue-200 rounded-lg p-4\">
            <h4 className=\"font-medium text-blue-800 mb-2\">Optimize Website Performance</h4>
            <p className=\"text-sm text-blue-700\">
              Website ROI is developing. Focus on SEO optimization and conversion rate improvements.
            </p>
          </div>
          <div className=\"bg-yellow-50 border border-yellow-200 rounded-lg p-4\">
            <h4 className=\"font-medium text-yellow-800 mb-2\">Enhance Social Engagement</h4>
            <p className=\"text-sm text-yellow-700\">
              Social media shows good ROI. Increase posting frequency and engagement strategies.
            </p>
          </div>
          <div className=\"bg-purple-50 border border-purple-200 rounded-lg p-4\">
            <h4 className=\"font-medium text-purple-800 mb-2\">Automation Opportunities</h4>
            <p className=\"text-sm text-purple-700\">
              Set up automated workflows to maximize efficiency and reduce manual work.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROITrackingDashboard;