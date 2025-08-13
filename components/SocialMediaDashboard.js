'use client'

import { useState, useEffect } from 'react'
import {
  ShareIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  CalendarDaysIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  PlusIcon,
  ArrowPathIcon,
  SparklesIcon,
  MegaphoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function SocialMediaDashboard({ barbershop_id = 'demo', compact = false }) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [creatingPost, setCreatingPost] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState(['instagram', 'facebook'])

  useEffect(() => {
    loadDashboard()
  }, [barbershop_id])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ai/social-media?barbershop_id=${barbershop_id}`)
      const data = await response.json()
      
      if (data.success) {
        setDashboard(data.dashboard)
      }
    } catch (error) {
      console.error('Failed to load social media dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const createPost = async (suggestion) => {
    setCreatingPost(true)
    try {
      const response = await fetch('/api/ai/social-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'create_post',
          barbershop_id,
          parameters: {
            platforms: selectedPlatforms,
            content: suggestion.content,
            hashtags: ['#barbershop', '#freshcut', '#grooming']
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`✅ Post created successfully!\n\nPosted to: ${data.results.filter(r => r.success).map(r => r.platform).join(', ')}\nEstimated reach: ${data.tracking.expected_reach}`)
        loadDashboard()
      } else {
        alert(`❌ Failed to create post: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to create post:', error)
      alert('❌ Failed to create post')
    } finally {
      setCreatingPost(false)
    }
  }

  const schedulePost = async (suggestion) => {
    try {
      const response = await fetch('/api/ai/social-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'schedule_post',
          barbershop_id,
          parameters: {
            platforms: selectedPlatforms,
            content: suggestion.content,
            content_type: suggestion.type,
            scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`📅 Post scheduled successfully!\n\nScheduled for: ${new Date(data.scheduled_post.scheduled_for).toLocaleString()}\nExpected engagement: ${data.optimization.expected_engagement}`)
        loadDashboard()
      }
    } catch (error) {
      console.error('Failed to schedule post:', error)
      alert('❌ Failed to schedule post')
    }
  }

  const generateContent = async (contentType) => {
    try {
      const response = await fetch('/api/ai/social-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'auto_generate_content',
          barbershop_id,
          parameters: {
            content_type: contentType,
            platform: 'instagram',
            tone: 'friendly',
            include_promotion: Math.random() > 0.5
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        const content = data.generated_content.content
        alert(`✨ Generated content:\n\n"${content}"\n\nEstimated engagement: ${data.generated_content.estimated_engagement} interactions`)
      }
    } catch (error) {
      console.error('Failed to generate content:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load social media dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md border">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <ShareIcon className="h-5 w-5 text-olive-500" />
          <h3 className="font-semibold text-gray-900">Social Media Hub</h3>
          <span className="bg-olive-100 text-olive-800 text-xs px-2 py-1 rounded-full">
            {dashboard.overview.posts_this_month} posts this month
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => generateContent('promotional')}
            className="text-olive-600 hover:text-olive-700 text-sm font-medium flex items-center space-x-1"
          >
            <SparklesIcon className="h-4 w-4" />
            <span>Generate</span>
          </button>
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="text-olive-600 hover:text-olive-700 text-sm font-medium flex items-center space-x-1"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      {!compact && (
        <div className="border-b">
          <nav className="flex space-x-6 px-4">
            {[
              { id: 'overview', name: 'Overview', icon: EyeIcon },
              { id: 'content', name: 'Content', icon: MegaphoneIcon },
              { id: 'analytics', name: 'Analytics', icon: ArrowTrendingUpIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-olive-500 text-olive-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="p-6">
        {/* Overview Tab */}
        {(activeTab === 'overview' || compact) && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-olive-50 to-indigo-50 rounded-lg p-4 border border-olive-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-olive-600">Total Followers</div>
                    <div className="text-2xl font-bold text-olive-900">
                      {dashboard.overview.total_followers.toLocaleString()}
                    </div>
                    <div className="text-xs text-olive-600">{dashboard.overview.monthly_growth} this month</div>
                  </div>
                  <HeartIcon className="h-8 w-8 text-olive-400" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-600">Engagement Rate</div>
                    <div className="text-2xl font-bold text-green-900">
                      {dashboard.overview.engagement_rate}
                    </div>
                    <div className="text-xs text-green-600">above industry avg</div>
                  </div>
                  <ChatBubbleLeftIcon className="h-8 w-8 text-green-400" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-gold-50 to-pink-50 rounded-lg p-4 border border-gold-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gold-600">Posts This Month</div>
                    <div className="text-2xl font-bold text-gold-900">
                      {dashboard.overview.posts_this_month}
                    </div>
                    <div className="text-xs text-gold-600">{dashboard.overview.automated_posts} automated</div>
                  </div>
                  <MegaphoneIcon className="h-8 w-8 text-gold-400" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-amber-600">Automation</div>
                    <div className="text-2xl font-bold text-amber-900">
                      {dashboard.automation_settings.auto_posting_enabled ? 'ON' : 'OFF'}
                    </div>
                    <div className="text-xs text-amber-600">{dashboard.automation_settings.post_frequency}</div>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-amber-400" />
                </div>
              </div>
            </div>

            {/* Platform Metrics */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Platform Performance</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(dashboard.platform_metrics).map(([platform, metrics]) => (
                  <div key={platform} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900 capitalize flex items-center space-x-2">
                        <span>{platform.replace('_', ' ')}</span>
                        <div className={`w-2 h-2 rounded-full ${
                          metrics.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                      </h5>
                      <span className="text-xs text-gray-500">{metrics.status}</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {platform === 'google_business' ? 'Reviews:' : 
                           platform === 'instagram' ? 'Followers:' : 'Likes:'}
                        </span>
                        <span className="font-medium">
                          {platform === 'google_business' ? metrics.reviews :
                           platform === 'instagram' ? metrics.followers :
                           metrics.likes}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Posts this month:</span>
                        <span className="font-medium">{metrics.posts_this_month}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {platform === 'google_business' ? 'Views:' : 'Reach:'}
                        </span>
                        <span className="font-medium">
                          {platform === 'google_business' ? metrics.views : metrics.reach}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Platform Selection */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Select Platforms for New Posts</h4>
              <div className="flex space-x-4">
                {['instagram', 'facebook', 'google_business'].map(platform => (
                  <label key={platform} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(platform)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPlatforms([...selectedPlatforms, platform])
                        } else {
                          setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{platform.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Content Suggestions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">AI Content Suggestions</h4>
              <div className="space-y-4">
                {dashboard.content_suggestions.map((suggestion, idx) => (
                  <div key={idx} className="border border-olive-200 rounded-lg p-4 bg-olive-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${{
                            promotional: 'bg-red-100 text-red-800',
                            behind_the_scenes: 'bg-gold-100 text-gold-800',
                            customer_showcase: 'bg-green-100 text-green-800',
                            educational: 'bg-olive-100 text-olive-800'
                          }[suggestion.type] || 'bg-gray-100 text-gray-800'}`}>
                            {suggestion.type.replace('_', ' ')}
                          </span>
                          <h5 className="font-medium text-olive-900">{suggestion.title}</h5>
                        </div>
                        <p className="text-olive-800 mb-3">{suggestion.content}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-olive-600 font-medium">Best Time:</span>
                            <span className="text-olive-800 ml-1">{suggestion.best_time}</span>
                          </div>
                          <div>
                            <span className="text-olive-600 font-medium">Expected:</span>
                            <span className="text-olive-800 ml-1">{suggestion.expected_engagement}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-olive-600 font-medium text-sm">Platforms:</span>
                          <span className="text-olive-800 ml-1 text-sm">{suggestion.platforms.join(', ')}</span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => createPost(suggestion)}
                          disabled={creatingPost}
                          className="bg-olive-600 text-white hover:bg-olive-700 px-3 py-1 rounded text-sm font-medium flex items-center space-x-1 disabled:opacity-50"
                        >
                          <PlusIcon className="h-3 w-3" />
                          <span>Post Now</span>
                        </button>
                        <button
                          onClick={() => schedulePost(suggestion)}
                          className="bg-olive-100 text-olive-700 hover:bg-olive-200 px-3 py-1 rounded text-sm font-medium flex items-center space-x-1"
                        >
                          <CalendarDaysIcon className="h-3 w-3" />
                          <span>Schedule</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Posts */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Recent Posts</h4>
              <div className="space-y-3">
                {dashboard.recent_posts.map((post, idx) => (
                  <div key={idx} className={`border-l-4 rounded-r-lg p-4 ${
                    post.performance === 'excellent' ? 'border-l-green-500 bg-green-50' :
                    post.performance === 'good' ? 'border-l-blue-500 bg-olive-50' :
                    'border-l-gray-500 bg-gray-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{post.platform}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            post.type === 'automated' ? 'bg-gold-100 text-gold-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {post.type}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            post.performance === 'excellent' ? 'bg-green-100 text-green-800' :
                            post.performance === 'good' ? 'bg-olive-100 text-olive-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {post.performance}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{post.content}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>❤️ {post.engagement.likes || post.engagement.views || 0}</span>
                          <span>💬 {post.engagement.comments || post.engagement.clicks || 0}</span>
                          <span>🔄 {post.engagement.shares || post.engagement.calls || 0}</span>
                          <span>{new Date(post.posted_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Performance Insights */}
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <h4 className="font-medium text-indigo-900 mb-3">📊 Performance Insights</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-olive-700">Best Content:</span>
                  <span className="text-indigo-800 ml-1">{dashboard.performance_insights.best_performing_content}</span>
                </div>
                <div>
                  <span className="font-medium text-olive-700">Engagement Trend:</span>
                  <span className="text-indigo-800 ml-1">{dashboard.performance_insights.engagement_trends}</span>
                </div>
                <div>
                  <span className="font-medium text-olive-700">Top Hashtags:</span>
                  <span className="text-indigo-800 ml-1">{dashboard.performance_insights.top_hashtags.slice(0, 3).join(', ')}</span>
                </div>
                <div>
                  <span className="font-medium text-olive-700">Audience:</span>
                  <span className="text-indigo-800 ml-1">{dashboard.performance_insights.audience_demographics.age_groups}</span>
                </div>
              </div>
            </div>

            {/* Optimal Posting Times */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">⏰ Optimal Posting Times</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dashboard.performance_insights.optimal_posting_times.map((time, idx) => (
                  <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                    <div className="font-medium text-yellow-900">{time}</div>
                    <div className="text-xs text-yellow-700">High engagement window</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Automation Status */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">🤖 Automation Settings</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {Object.entries(dashboard.automation_settings).map(([setting, value]) => (
                  <div key={setting} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="capitalize text-gray-600">{setting.replace('_', ' ')}:</span>
                    <span className={`font-medium ${
                      typeof value === 'boolean' 
                        ? (value ? 'text-green-600' : 'text-red-600')
                        : 'text-gray-900'
                    }`}>
                      {typeof value === 'boolean' ? (value ? '✅' : '❌') : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}