'use client'

import { 
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  ChartBarIcon,
  BookOpenIcon,
  CpuChipIcon,
  RocketLaunchIcon,
  BeakerIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { useState, lazy, Suspense } from 'react'

import TabbedPageLayout, { TabContent, EmptyStates } from '../../../components/layout/TabbedPageLayout'
import { useAuth } from '../../../components/SupabaseAuthProvider'

// Lazy load AI components
const AIAgentChat = lazy(() => import('../../../components/ai/AIAgentChat'))
const AITrainingInterface = lazy(() => import('../../../components/ai/AITrainingInterface'))

// AI Dashboard component
const AIDashboard = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* AI Agent Status Cards */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <SparklesIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Marcus</h3>
            <p className="text-sm text-gray-600">Master Coach</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Conversations Today</span>
            <span className="font-medium">127</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Avg Confidence</span>
            <span className="font-medium">94%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Status</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sophia</h3>
            <p className="text-sm text-gray-600">Marketing Expert</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Campaigns Generated</span>
            <span className="font-medium">23</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Success Rate</span>
            <span className="font-medium">87%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Status</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
            <ChartBarIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">David</h3>
            <p className="text-sm text-gray-600">Operations Manager</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Optimizations</span>
            <span className="font-medium">45</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Cost Savings</span>
            <span className="font-medium">$2,340</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Status</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Recent AI Activity */}
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent AI Activity</h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
          <SparklesIcon className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Marcus provided scheduling optimization</p>
            <p className="text-xs text-gray-600">Suggested moving 3 appointments to increase daily revenue by $180</p>
          </div>
          <span className="text-xs text-gray-500">2 min ago</span>
        </div>
        
        <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-lg">
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-purple-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Sophia created new social media campaign</p>
            <p className="text-xs text-gray-600">Generated 5 Instagram posts for summer promotions</p>
          </div>
          <span className="text-xs text-gray-500">15 min ago</span>
        </div>
        
        <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
          <ChartBarIcon className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">David analyzed inventory levels</p>
            <p className="text-xs text-gray-600">Recommended reordering hair products for next week</p>
          </div>
          <span className="text-xs text-gray-500">1 hour ago</span>
        </div>
      </div>
    </div>
  </div>
)

// AI Performance component
const AIPerformance = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Conversations</dt>
              <dd className="text-lg font-medium text-gray-900">2,847</dd>
            </dl>
          </div>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <SparklesIcon className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Avg Confidence</dt>
              <dd className="text-lg font-medium text-gray-900">91.2%</dd>
            </dl>
          </div>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <RocketLaunchIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Response Time</dt>
              <dd className="text-lg font-medium text-gray-900">1.2s</dd>
            </dl>
          </div>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ChartBarIcon className="h-6 w-6 text-orange-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
              <dd className="text-lg font-medium text-gray-900">94.7%</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
    
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">AI Performance Trends</h3>
      <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
        <p className="text-gray-500">Performance analytics chart would go here</p>
      </div>
    </div>
  </div>
)

// Knowledge Base component
const KnowledgeBase = () => (
  <div className="space-y-6">
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Business Knowledge</h3>
        <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <BookOpenIcon className="h-4 w-4 mr-2" />
          Add Knowledge
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Peak Hour Strategies</h4>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Operations
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Best practices for managing high-traffic periods and maximizing revenue during peak hours.
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">Confidence: 94%</span>
            <span className="text-xs text-gray-500">Last updated: 2 days ago</span>
          </div>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Customer Retention Tactics</h4>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Marketing
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Proven strategies for increasing customer loyalty and repeat visit rates.
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">Confidence: 91%</span>
            <span className="text-xs text-gray-500">Last updated: 1 week ago</span>
          </div>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Service Pricing Models</h4>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Revenue
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Dynamic pricing strategies based on demand, time of day, and service complexity.
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">Confidence: 87%</span>
            <span className="text-xs text-gray-500">Last updated: 3 days ago</span>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export default function AIToolsPage() {
  const { user, profile } = useAuth()

  // Define AI Tools tabs
  const aiToolsTabs = [
    {
      id: 'dashboard',
      name: 'AI Dashboard',
      icon: CpuChipIcon,
      badge: 'Live',
      description: 'Real-time overview of all AI agent activities and performance metrics.',
      features: [
        'Live agent status monitoring',
        'Recent activity feed',
        'Performance summaries',
        'Quick agent access'
      ],
      component: <AIDashboard />
    },
    {
      id: 'chat',
      name: 'AI Chat',
      icon: ChatBubbleLeftRightIcon,
      badge: 'GPT-4',
      description: 'Multi-model AI assistant for business questions and recommendations.',
      features: [
        'OpenAI GPT-4 integration',
        'Anthropic Claude access',
        'Google Gemini support',
        'Business context awareness'
      ],
      component: (
        <TabContent loading={false}>
          <div className="bg-white border border-gray-200 rounded-lg">
            <Suspense fallback={<div className="animate-pulse h-96 bg-gray-100 rounded"></div>}>
              <AIAgentChat />
            </Suspense>
          </div>
        </TabContent>
      )
    },
    {
      id: 'agents',
      name: 'AI Agents',
      icon: SparklesIcon,
      badge: '6 Agents',
      description: 'Individual AI specialists for different aspects of your barbershop business.',
      features: [
        'Marcus - Master Coach',
        'Sophia - Marketing Expert',
        'David - Operations Manager',
        'Specialized domain expertise'
      ],
      component: (
        <TabContent 
          emptyState={<EmptyStates.ComingSoon title="AI Agents Hub" description="Direct agent interaction coming soon." />}
        />
      )
    },
    {
      id: 'knowledge',
      name: 'Knowledge Base',
      icon: BookOpenIcon,
      badge: 'RAG',
      description: 'Business knowledge and best practices that power AI recommendations.',
      features: [
        'Curated business expertise',
        'Industry best practices',
        'Custom knowledge entries',
        'AI learning from data'
      ],
      component: <KnowledgeBase />
    },
    {
      id: 'training',
      name: 'AI Training',
      icon: AcademicCapIcon,
      description: 'Train and customize AI agents for your specific business needs.',
      features: [
        'Custom prompt engineering',
        'Business-specific training',
        'Performance optimization',
        'Knowledge fine-tuning'
      ],
      component: (
        <TabContent loading={false}>
          <div className="bg-white border border-gray-200 rounded-lg">
            <Suspense fallback={<div className="animate-pulse h-96 bg-gray-100 rounded"></div>}>
              <AITrainingInterface />
            </Suspense>
          </div>
        </TabContent>
      )
    },
    {
      id: 'performance',
      name: 'Performance',
      icon: ChartBarIcon,
      badge: 'Analytics',
      description: 'Monitor AI system performance, response times, and accuracy metrics.',
      features: [
        'Response time tracking',
        'Confidence score analysis',
        'Usage analytics',
        'Success rate monitoring'
      ],
      component: <AIPerformance />
    },
    {
      id: 'test-center',
      name: 'Test Center',
      icon: BeakerIcon,
      badge: '3 Models',
      description: 'Test and compare AI model responses across different providers.',
      features: [
        'Multi-model testing',
        'Response comparison',
        'Performance benchmarking',
        'A/B testing tools'
      ],
      component: (
        <TabContent 
          emptyState={<EmptyStates.ComingSoon title="AI Test Center" description="Model testing interface coming soon." />}
        />
      )
    },
    {
      id: 'settings',
      name: 'AI Settings',
      icon: Cog6ToothIcon,
      description: 'Configure AI behavior, model preferences, and system parameters.',
      features: [
        'Model selection preferences',
        'Response temperature settings',
        'Context window configuration',
        'API key management'
      ],
      component: (
        <TabContent 
          emptyState={<EmptyStates.ComingSoon title="AI Configuration" description="AI settings interface coming soon." />}
        />
      )
    }
  ]

  return (
    <TabbedPageLayout
      title="AI Tools & Agents"
      description="Intelligent business assistance powered by advanced AI models"
      icon={SparklesIcon}
      tabs={aiToolsTabs}
      defaultTab="dashboard"
      fullWidth={true}
    />
  )
}