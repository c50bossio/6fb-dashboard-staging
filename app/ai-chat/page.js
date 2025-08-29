'use client';

import ChatInterface from '@/components/ai/ChatInterface';

/**
 * AI Chat Page - Standalone page for AI agent interactions
 */
export default function AIAgentChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Business Advisor</h1>
              <p className="text-sm text-gray-500 mt-1">
                Get instant insights and recommendations from AI experts
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Powered by AI</span>
              <div className="flex space-x-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-75"></span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-150"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Interface - Main */}
          <div className="lg:col-span-2">
            <ChatInterface 
              className="h-[600px]"
              barbershopId="550e8400-e29b-41d4-a716-446655440000"
            />
          </div>
          
          {/* Side Panel - Features & Tips */}
          <div className="space-y-6">
            {/* Features Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">AI Capabilities</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-xl">📊</span>
                  <div>
                    <p className="font-medium text-sm">Business Analytics</p>
                    <p className="text-xs text-gray-500">Revenue trends, customer insights</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <p className="font-medium text-sm">Growth Strategies</p>
                    <p className="text-xs text-gray-500">Personalized recommendations</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-xl">🎯</span>
                  <div>
                    <p className="font-medium text-sm">Marketing Advice</p>
                    <p className="text-xs text-gray-500">Campaign ideas, targeting tips</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-xl">📈</span>
                  <div>
                    <p className="font-medium text-sm">Financial Planning</p>
                    <p className="text-xs text-gray-500">Pricing, cost optimization</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tips Card */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">Pro Tips</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Be specific with your questions for better insights</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Try different agents for specialized advice</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Use suggestions to explore related topics</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Share your business context for personalized recommendations</span>
                </li>
              </ul>
            </div>
            
            {/* Stats Card */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Your AI Usage</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Questions Asked</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Insights Generated</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Most Used Agent</span>
                  <span className="font-medium">-</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Time Saved</span>
                  <span className="font-medium">0 hrs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}