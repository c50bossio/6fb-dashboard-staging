'use client'

import { useState } from 'react'
import { 
  Star, 
  Trophy, 
  Users, 
  Gift,
  Smartphone,
  Tablet,
  Monitor,
  Palette,
  Play
} from 'lucide-react'
import LoyaltyPointsDisplay from './LoyaltyPointsDisplay'
import LoyaltyPointsBadge, { QuickRedeemButton } from './LoyaltyPointsBadge'
import TierProgressVisualization from './TierProgressVisualization'
import { AnimatedPointsEffect, PointsCounterAnimation, TierProgressAnimation, PulseEffect } from './AnimatedPointsEffect'
import PointsExpirationWarning, { PointsExpirationBadge } from './PointsExpirationWarning'

/**
 * LoyaltySystemDemo Component
 * 
 * A comprehensive demo and testing interface for the loyalty points system
 * Showcases all components in different states and screen sizes
 */
export default function LoyaltySystemDemo({ 
  customerId = 'demo-customer-1',
  barbershopId = 'demo-barbershop-1',
  programId = 'demo-program-1'
}) {
  const [selectedView, setSelectedView] = useState('overview')
  const [selectedDevice, setSelectedDevice] = useState('desktop')
  const [selectedTheme, setSelectedTheme] = useState('default')
  const [demoPoints, setDemoPoints] = useState(1250)
  const [demoTier, setDemoTier] = useState('Silver')
  const [animationTrigger, setAnimationTrigger] = useState(null)

  // Mock customer data for demo
  const mockCustomers = [
    {
      id: 'demo-1',
      name: 'John Smith',
      email: 'john@example.com',
      phone: '+1 (555) 123-4567',
      segment: 'vip',
      totalVisits: 15,
      lastVisit: '2024-01-15',
      totalSpent: 850,
      barbershopId: barbershopId,
      current_points: 1250,
      current_tier: 'Silver',
      tier_progress: 65
    },
    {
      id: 'demo-2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone: '+1 (555) 234-5678',
      segment: 'regular',
      totalVisits: 8,
      lastVisit: '2024-01-10',
      totalSpent: 420,
      barbershopId: barbershopId,
      current_points: 420,
      current_tier: 'Bronze',
      tier_progress: 84
    },
    {
      id: 'demo-3',
      name: 'Mike Wilson',
      email: 'mike@example.com',
      phone: '+1 (555) 345-6789',
      segment: 'new',
      totalVisits: 2,
      lastVisit: '2024-01-12',
      totalSpent: 120,
      barbershopId: barbershopId,
      current_points: 120,
      current_tier: 'Bronze',
      tier_progress: 24
    }
  ]

  // Device viewport classes
  const getDeviceClass = () => {
    switch (selectedDevice) {
      case 'mobile': return 'max-w-sm mx-auto'
      case 'tablet': return 'max-w-2xl mx-auto'
      case 'desktop': 
      default: return 'max-w-7xl mx-auto'
    }
  }

  // Theme classes
  const getThemeClass = () => {
    switch (selectedTheme) {
      case 'dark': return 'bg-gray-900 text-white'
      case 'colorful': return 'bg-gradient-to-br from-purple-50 to-pink-50'
      case 'minimal': return 'bg-gray-50'
      case 'default':
      default: return 'bg-white'
    }
  }

  // Simulate points animation
  const simulatePointsChange = (change, type = 'earned') => {
    if (animationTrigger) {
      animationTrigger(change, type)
    }
    setDemoPoints(prev => prev + change)
  }

  // Simulate tier upgrade
  const simulateTierUpgrade = () => {
    if (animationTrigger) {
      animationTrigger(0, 'tier_upgrade')
    }
    setDemoTier(prev => {
      const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum']
      const currentIndex = tiers.indexOf(prev)
      return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : prev
    })
  }

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Loyalty Points System</h1>
        <p className="text-gray-600">Complete loyalty management for barbershop customers</p>
      </div>

      {/* Feature Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Loyalty Display */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Full Loyalty Display</h2>
          <LoyaltyPointsDisplay 
            customerId={customerId}
            barbershopId={barbershopId}
            programId={programId}
            showHistory={true}
            showRewards={true}
            compact={false}
          />
        </div>

        {/* Tier Visualization */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Tier Progress Visualization</h2>
          <TierProgressVisualization 
            customerId={customerId}
            barbershopId={barbershopId}
            programId={programId}
            showBenefits={true}
            showRoadmap={true}
            variant="compact"
          />
        </div>
      </div>

      {/* Points Expiration Warning */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Expiration Warnings</h2>
        <PointsExpirationWarning 
          customerId={customerId}
          barbershopId={barbershopId}
          programId={programId}
          threshold={30}
        />
      </div>

      {/* Animation Demo */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Animation Demo</h2>
        <div className="bg-gray-50 rounded-lg p-6">
          <AnimatedPointsEffect onPointsChange={setAnimationTrigger}>
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold text-gray-900">
                <PointsCounterAnimation currentPoints={demoPoints} />
              </div>
              <div className="text-lg text-gray-600">Demo Points</div>
              
              <div className="flex justify-center space-x-2">
                <button 
                  onClick={() => simulatePointsChange(50, 'earned')}
                  className="btn-primary text-sm"
                >
                  +50 Earned
                </button>
                <button 
                  onClick={() => simulatePointsChange(100, 'bonus')}
                  className="btn-secondary text-sm"
                >
                  +100 Bonus
                </button>
                <button 
                  onClick={() => simulatePointsChange(-25, 'redeemed')}
                  className="btn-secondary text-sm"
                >
                  -25 Redeemed
                </button>
                <button 
                  onClick={simulateTierUpgrade}
                  className="bg-gold-600 text-white px-3 py-1 rounded text-sm hover:bg-gold-700"
                >
                  Tier Upgrade!
                </button>
              </div>
            </div>
          </AnimatedPointsEffect>
        </div>
      </div>
    </div>
  )

  const renderComponents = () => (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Component Library</h1>
      
      {/* Loyalty Badges */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Loyalty Badges</h2>
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div className="space-y-3">
            <h3 className="font-medium">Default Size</h3>
            <LoyaltyPointsBadge 
              customerId={customerId}
              barbershopId={barbershopId}
              size="default"
              showProgress={true}
            />
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium">Small Size</h3>
            <LoyaltyPointsBadge 
              customerId={customerId}
              barbershopId={barbershopId}
              size="sm"
              showProgress={false}
            />
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium">Large Size</h3>
            <LoyaltyPointsBadge 
              customerId={customerId}
              barbershopId={barbershopId}
              size="lg"
              showProgress={true}
            />
          </div>
        </div>
      </div>

      {/* Progress Animations */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Progress Animations</h2>
        <div className="bg-gray-50 rounded-lg p-6 space-y-6">
          <div>
            <h3 className="font-medium mb-2">Tier Progress (65%)</h3>
            <TierProgressAnimation 
              currentProgress={65}
              previousProgress={45}
              duration={2000}
            />
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Pulse Effects</h3>
            <div className="flex space-x-4">
              <PulseEffect active={true} color="gold" intensity="low">
                <div className="p-3 bg-gold-100 rounded-lg">Low Intensity</div>
              </PulseEffect>
              <PulseEffect active={true} color="green" intensity="medium">
                <div className="p-3 bg-green-100 rounded-lg">Medium Intensity</div>
              </PulseEffect>
              <PulseEffect active={true} color="blue" intensity="high">
                <div className="p-3 bg-blue-100 rounded-lg">High Intensity</div>
              </PulseEffect>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCustomerCards = () => (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Customer Cards with Loyalty</h1>
      
      <div className="grid gap-4">
        {mockCustomers.map((customer) => (
          <div
            key={customer.id}
            className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{customer.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      customer.segment === 'vip' ? 'bg-gold-100 text-gold-800' :
                      customer.segment === 'regular' ? 'bg-olive-100 text-olive-800' :
                      'bg-moss-100 text-moss-900'
                    }`}>
                      {customer.segment === 'vip' ? 'VIP' : customer.segment.toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Loyalty Points Badge */}
                  <div className="mb-2">
                    <LoyaltyPointsBadge 
                      customerId={customer.id}
                      barbershopId={customer.barbershopId}
                      size="default"
                      showProgress={true}
                    />
                  </div>
                  
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span>{customer.email}</span>
                    <span>{customer.phone}</span>
                  </div>
                  
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                    <span>Visits: {customer.totalVisits}</span>
                    <span>Spent: ${customer.totalSpent}</span>
                    <span>Last visit: {customer.lastVisit}</span>
                    <QuickRedeemButton 
                      customerId={customer.id}
                      barbershopId={customer.barbershopId}
                    />
                    <PointsExpirationBadge 
                      customerId={customer.id}
                      barbershopId={customer.barbershopId}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">
                  Profile
                </button>
                <button className="px-3 py-2 bg-olive-100 text-olive-700 rounded-md hover:bg-olive-200 text-sm">
                  Book Again
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderResponsiveTest = () => (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Responsive Design Test</h1>
      
      {/* Device Selector */}
      <div className="flex space-x-2 mb-6">
        {[
          { id: 'mobile', icon: Smartphone, label: 'Mobile' },
          { id: 'tablet', icon: Tablet, label: 'Tablet' },
          { id: 'desktop', icon: Monitor, label: 'Desktop' }
        ].map(device => {
          const Icon = device.icon
          return (
            <button
              key={device.id}
              onClick={() => setSelectedDevice(device.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm ${
                selectedDevice === device.id 
                  ? 'bg-olive-100 text-olive-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{device.label}</span>
            </button>
          )
        })}
      </div>

      {/* Responsive Container */}
      <div className={`border-2 border-dashed border-gray-300 p-4 ${getDeviceClass()}`}>
        <div className="space-y-6">
          {/* Compact Display */}
          <LoyaltyPointsDisplay 
            customerId={customerId}
            barbershopId={barbershopId}
            programId={programId}
            compact={selectedDevice === 'mobile'}
            showHistory={selectedDevice !== 'mobile'}
            showRewards={selectedDevice === 'desktop'}
          />
          
          {/* Tier Visualization */}
          <TierProgressVisualization 
            customerId={customerId}
            barbershopId={barbershopId}
            programId={programId}
            variant={selectedDevice === 'mobile' ? 'minimal' : selectedDevice === 'tablet' ? 'compact' : 'full'}
            showBenefits={selectedDevice !== 'mobile'}
            showRoadmap={selectedDevice === 'desktop'}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen ${getThemeClass()}`}>
      <div className={`px-4 sm:px-6 lg:px-8 py-8 ${getDeviceClass()}`}>
        {/* Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { id: 'overview', label: 'Overview', icon: Star },
              { id: 'components', label: 'Components', icon: Gift },
              { id: 'cards', label: 'Customer Cards', icon: Users },
              { id: 'responsive', label: 'Responsive', icon: Smartphone }
            ].map(view => {
              const Icon = view.icon
              return (
                <button
                  key={view.id}
                  onClick={() => setSelectedView(view.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${
                    selectedView === view.id 
                      ? 'bg-olive-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{view.label}</span>
                </button>
              )
            })}
          </div>
          
          {/* Theme Selector */}
          <div className="flex items-center space-x-2">
            <Palette className="h-4 w-4 text-gray-600" />
            <select 
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="default">Default Theme</option>
              <option value="dark">Dark Theme</option>
              <option value="colorful">Colorful Theme</option>
              <option value="minimal">Minimal Theme</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {selectedView === 'overview' && renderOverview()}
          {selectedView === 'components' && renderComponents()}
          {selectedView === 'cards' && renderCustomerCards()}
          {selectedView === 'responsive' && renderResponsiveTest()}
        </div>
      </div>
    </div>
  )
}