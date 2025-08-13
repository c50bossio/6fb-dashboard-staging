'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeAltIcon,
  UserGroupIcon,
  StarIcon,
  MapPinIcon,
  PhoneIcon,
  PencilSquareIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import {
  StarIcon as StarIconSolid,
  ChartBarIcon as ChartBarIconSolid
} from '@heroicons/react/24/solid'

export default function SEODashboard() {
  const [loading, setLoading] = useState(true)
  const [seoData, setSeoData] = useState(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')

  // Demo data - in production would be fetched from API
  useEffect(() => {
    const loadSEOData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        const demoData = {
          overview: {
            total_keywords: 156,
            ranking_keywords: 98,
            avg_position: 12.3,
            organic_traffic: 2847,
            traffic_change: +23.5,
            content_pieces: 24,
            gmb_posts: 48,
            review_score: 4.8,
            citations: 38,
            domain_authority: 34
          },
          keyword_rankings: [
            { keyword: 'barber los angeles', position: 3, change: +2, volume: 'High', difficulty: 'Medium' },
            { keyword: 'mens haircut downtown la', position: 8, change: -1, volume: 'Medium', difficulty: 'Low' },
            { keyword: 'fade cut los angeles', position: 12, change: +5, volume: 'Medium', difficulty: 'Medium' },
            { keyword: 'best barber near me', position: 6, change: +3, volume: 'High', difficulty: 'High' },
            { keyword: 'beard trim los angeles', position: 15, change: 0, volume: 'Low', difficulty: 'Low' }
          ],
          content_calendar: [
            {
              id: 1,
              title: '5 Best Haircuts for LA Professionals',
              type: 'Blog Post',
              status: 'published',
              publish_date: '2024-01-15',
              keywords: ['professional haircuts', 'business haircuts la'],
              performance: 'good'
            },
            {
              id: 2,
              title: 'Winter Hair Care Tips for California',
              type: 'Blog Post', 
              status: 'scheduled',
              publish_date: '2024-01-20',
              keywords: ['winter hair care', 'california hair tips'],
              performance: 'pending'
            },
            {
              id: 3,
              title: 'New Year Special - 20% Off All Services',
              type: 'GMB Post',
              status: 'published',
              publish_date: '2024-01-10',
              keywords: ['barbershop promotion', 'new year special'],
              performance: 'excellent'
            }
          ],
          competitors: [
            {
              id: 1,
              name: 'Classic Cuts Barbershop',
              position: 2,
              estimated_traffic: 3200,
              content_frequency: 'Weekly',
              strengths: ['Strong GMB presence', 'Regular content'],
              weaknesses: ['Poor mobile site', 'Limited services']
            },
            {
              id: 2,
              name: 'Modern Men\'s Grooming',
              position: 4,
              estimated_traffic: 1800,
              content_frequency: 'Bi-weekly',
              strengths: ['Great website design', 'Social media active'],
              weaknesses: ['Few reviews', 'Limited local content']
            }
          ],
          opportunities: [
            {
              id: 1,
              type: 'keyword',
              priority: 'high',
              title: 'Target "wedding haircuts"',
              description: 'Seasonal opportunity with low competition',
              impact: 'high',
              effort: 'medium',
              keywords: ['wedding haircuts', 'groom grooming']
            },
            {
              id: 2,
              type: 'content',
              priority: 'medium',
              title: 'Create beard care content series',
              description: 'Competitors lack comprehensive beard content',
              impact: 'medium',
              effort: 'low',
              keywords: ['beard care tips', 'beard maintenance']
            },
            {
              id: 3,
              type: 'technical',
              priority: 'high',
              title: 'Add schema markup',
              description: 'Improve search result appearance',
              impact: 'high',
              effort: 'low',
              keywords: []
            }
          ],
          ai_recommendations: [
            {
              category: 'content',
              title: 'Increase blog posting frequency',
              description: 'Post 3x per week to outpace competitors',
              priority: 'high'
            },
            {
              category: 'local_seo',
              title: 'Optimize Google My Business',
              description: 'Add more photos and post daily updates',
              priority: 'medium'
            },
            {
              category: 'technical',
              title: 'Improve page loading speed',
              description: 'Current speed is 2.8s, target under 2s',
              priority: 'medium'
            }
          ],
          traffic_chart: [
            { month: 'Jul', organic: 1200, paid: 400, total: 1600 },
            { month: 'Aug', organic: 1450, paid: 380, total: 1830 },
            { month: 'Sep', organic: 1680, paid: 420, total: 2100 },
            { month: 'Oct', organic: 1890, paid: 350, total: 2240 },
            { month: 'Nov', organic: 2150, paid: 380, total: 2530 },
            { month: 'Dec', organic: 2460, paid: 390, total: 2850 },
            { month: 'Jan', organic: 2847, paid: 410, total: 3257 }
          ]
        }
        
        setSeoData(demoData)
      } catch (error) {
        console.error('Error loading SEO data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadSEOData()
  }, [selectedTimeRange])

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-amber-800 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPerformanceIcon = (performance) => {
    switch (performance) {
      case 'excellent': return <TrendingUpIcon className="h-4 w-4 text-green-500" />
      case 'good': return <CheckCircleIcon className="h-4 w-4 text-olive-500" />
      case 'pending': return <ClockIcon className="h-4 w-4 text-amber-800" />
      default: return <ExclamationTriangleIcon className="h-4 w-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading AI SEO Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <ChartBarIconSolid className="h-8 w-8 text-olive-600" />
                AI SEO Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Automated SEO optimization and competitive intelligence
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              
              <button className="flex items-center gap-2 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700">
                <ArrowPathIcon className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Organic Traffic</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(seoData.overview.organic_traffic)}
                </p>
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUpIcon className="h-4 w-4" />
                <span className="text-sm font-medium">+{seoData.overview.traffic_change}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Keywords Ranking</p>
                <p className="text-2xl font-bold text-gray-900">
                  {seoData.overview.ranking_keywords}
                </p>
              </div>
              <MagnifyingGlassIcon className="h-8 w-8 text-olive-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Position</p>
                <p className="text-2xl font-bold text-gray-900">
                  {seoData.overview.avg_position}
                </p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-olive-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Content Pieces</p>
                <p className="text-2xl font-bold text-gray-900">
                  {seoData.overview.content_pieces}
                </p>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Review Score</p>
                <p className="text-2xl font-bold text-gray-900 flex items-center gap-1">
                  {seoData.overview.review_score}
                  <StarIconSolid className="h-5 w-5 text-yellow-400" />
                </p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-amber-800" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'keywords', name: 'Keywords', icon: MagnifyingGlassIcon },
              { id: 'content', name: 'Content Calendar', icon: CalendarDaysIcon },
              { id: 'competitors', name: 'Competitors', icon: EyeIcon },
              { id: 'opportunities', name: 'Opportunities', icon: TrendingUpIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-olive-500 text-olive-600 bg-indigo-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2 rounded-t-lg`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* AI Recommendations */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <StarIcon className="h-5 w-5 text-amber-800" />
                  AI Recommendations
                </h3>
                <button className="text-olive-600 hover:text-olive-700 text-sm font-medium">
                  View All
                </button>
              </div>
              
              <div className="space-y-4">
                {seoData.ai_recommendations.map((rec, index) => (
                  <div key={index} className="border-l-4 border-indigo-400 pl-4 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{rec.title}</h4>
                        <p className="text-gray-600 text-sm">{rec.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                        {rec.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Traffic Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Traffic Trends
              </h3>
              
              <div className="h-64 flex items-end justify-between space-x-2">
                {seoData.traffic_chart.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gray-200 rounded-t relative" style={{ height: '200px' }}>
                      <div 
                        className="bg-olive-500 rounded-t w-full absolute bottom-0"
                        style={{ height: `${(data.organic / 3500) * 200}px` }}
                      ></div>
                      <div 
                        className="bg-olive-300 rounded-t w-full absolute bottom-0"
                        style={{ height: `${(data.total / 3500) * 200}px`, opacity: 0.7 }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 mt-2">{data.month}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-olive-500 rounded"></div>
                  <span className="text-sm text-gray-600">Organic Traffic</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-olive-300 rounded"></div>
                  <span className="text-sm text-gray-600">Total Traffic</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'keywords' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Keyword Rankings</h3>
              <p className="text-gray-600">Track your most important keyword positions</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {seoData.keyword_rankings.map((keyword, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {keyword.keyword}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          keyword.position <= 3 ? 'bg-moss-100 text-moss-900' :
                          keyword.position <= 10 ? 'bg-amber-100 text-amber-900' :
                          'bg-softred-100 text-softred-900'
                        }`}>
                          #{keyword.position}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className={`flex items-center gap-1 ${
                          keyword.change > 0 ? 'text-green-600' : 
                          keyword.change < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {keyword.change > 0 && <TrendingUpIcon className="h-4 w-4" />}
                          {keyword.change < 0 && <TrendingDownIcon className="h-4 w-4" />}
                          {keyword.change !== 0 && Math.abs(keyword.change)}
                          {keyword.change === 0 && '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{keyword.volume}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{keyword.difficulty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Content Calendar</h3>
                  <p className="text-gray-600">Automated content planning and performance tracking</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700">
                  <PencilSquareIcon className="h-4 w-4" />
                  Generate Content
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {seoData.content_calendar.map((content) => (
                  <div key={content.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getPerformanceIcon(content.performance)}
                          <h4 className="font-medium text-gray-900">{content.title}</h4>
                        </div>
                        <span className="px-2 py-1 bg-olive-100 text-olive-800 text-xs rounded-full">
                          {content.type}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          content.status === 'published' ? 'bg-moss-100 text-moss-900' :
                          content.status === 'scheduled' ? 'bg-amber-100 text-amber-900' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {content.status}
                        </span>
                        <span className="text-sm text-gray-500">{content.publish_date}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {content.keywords.map((keyword, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'competitors' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Competitive Analysis</h3>
              <p className="text-gray-600">Monitor competitor performance and identify opportunities</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {seoData.competitors.map((competitor) => (
                  <div key={competitor.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">{competitor.name}</h4>
                        <p className="text-gray-600">Position #{competitor.position} • {formatNumber(competitor.estimated_traffic)} traffic</p>
                      </div>
                      <span className="text-sm text-gray-500">Posts {competitor.content_frequency}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-green-700 mb-2">Strengths</h5>
                        <ul className="space-y-1">
                          {competitor.strengths.map((strength, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-red-700 mb-2">Weaknesses</h5>
                        <ul className="space-y-1">
                          {competitor.weaknesses.map((weakness, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="space-y-6">
            {seoData.opportunities.map((opportunity) => (
              <div key={opportunity.id} className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      opportunity.priority === 'high' ? 'bg-red-500' :
                      opportunity.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <h3 className="font-semibold text-gray-900">{opportunity.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(opportunity.priority)}`}>
                      {opportunity.priority} priority
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Impact: {opportunity.impact}</span>
                    <span>Effort: {opportunity.effort}</span>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4">{opportunity.description}</p>
                
                {opportunity.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {opportunity.keywords.map((keyword, index) => (
                      <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}