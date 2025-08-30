'use client'

import { useState, useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline'

export default function AIOptimizationPanel({ providers = [] }) {
  const [costSaved, setCostSaved] = useState(0)
  const [monthlyCost, setMonthlyCost] = useState(0)
  const [cacheHitRate, setCacheHitRate] = useState(62)
  const [animatedSaved, setAnimatedSaved] = useState(0)
  const [animatedMonthlyCost, setAnimatedMonthlyCost] = useState(0)

  // Default providers if none provided
  const defaultProviders = [
    { name: 'Anthropic', priority: 1, status: 'active', cost: '$0.250/1M', tokens: '1M' },
    { name: 'OpenAI', priority: 2, status: 'active', cost: '$0.150/1M', tokens: '1M' },
    { name: 'Google', priority: 3, status: 'active', cost: '$0.075/1M', tokens: '1M' }
  ]

  const displayProviders = providers.length > 0 ? providers : defaultProviders

  useEffect(() => {
    // Simulate real-time cost updates
    const interval = setInterval(() => {
      setCostSaved(prev => prev + Math.random() * 0.001)
      setMonthlyCost(prev => prev + Math.random() * 0.01)
      setCacheHitRate(prev => Math.min(100, prev + (Math.random() - 0.3) * 2))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Animate numbers
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedSaved(costSaved)
    }, 100)
    return () => clearTimeout(timer)
  }, [costSaved])

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedMonthlyCost(monthlyCost)
    }, 100)
    return () => clearTimeout(timer)
  }, [monthlyCost])

  const getStatusIcon = (status) => {
    if (status === 'active') {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />
    }
    return <XCircleIcon className="h-5 w-5 text-red-500" />
  }

  const getProviderLogo = (name) => {
    // In a real app, these would be actual logo imports
    const logos = {
      'Anthropic': '🤖',
      'OpenAI': '🧠',
      'Google': '🔍'
    }
    return logos[name] || '🔧'
  }

  return (
    <div className="bg-white/5 dark:bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-200/10 dark:border-gray-700/30 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold text-white">AI Cost Optimization</h3>
        </div>
        <span className="text-xs text-green-500 font-medium bg-green-500/20 px-2 py-1 rounded-full">
          60% Savings
        </span>
      </div>

      <p className="text-sm text-gray-400 mb-6">
        Multi-provider system with intelligent caching
      </p>

      {/* Cost Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Total Saved</p>
          <p className="text-2xl font-bold text-green-500">
            ${animatedSaved.toFixed(3)}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Monthly Est.</p>
          <p className="text-2xl font-bold text-white">
            ${animatedMonthlyCost.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Cache Hit Rate */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Cache Hit Rate</span>
          <span className="text-sm font-medium text-blue-400">{cacheHitRate.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-700/50 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${cacheHitRate}%` }}
          />
        </div>
      </div>

      {/* Provider Status */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300 mb-3">AI Provider Status</h4>
        <p className="text-xs text-gray-400 mb-3">
          Multi-provider failover system for optimal reliability
        </p>
        
        {displayProviders.map((provider, index) => (
          <div key={provider.name} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
            <div className="flex items-center space-x-3">
              {getStatusIcon(provider.status)}
              <div className="flex items-center space-x-2">
                <span className="text-xl">{getProviderLogo(provider.name)}</span>
                <div>
                  <p className="text-sm font-medium text-white">{provider.name}</p>
                  <p className="text-xs text-gray-400">Priority {provider.priority}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">{provider.cost}</p>
              <p className="text-xs text-gray-400">tokens</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}