'use client'

import { 
  LinkIcon,
  QrCodeIcon,
  GlobeAltIcon,
  CodeBracketIcon,
  ChartBarIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

import AnalyticsTab from '../../../../components/barber/booking-hub/AnalyticsTab'
import EmbedWidgetsTab from '../../../../components/barber/booking-hub/EmbedWidgetsTab'
import MarketingLinksTab from '../../../../components/barber/booking-hub/MarketingLinksTab'
import PublicPageTab from '../../../../components/barber/booking-hub/PublicPageTab'
import QRCodesTab from '../../../../components/barber/booking-hub/QRCodesTab'

export default function BookingHub() {
  const [activeTab, setActiveTab] = useState('public-page')
  
  const tabs = [
    {
      id: 'public-page',
      name: 'Public Page',
      icon: EyeIcon,
      description: 'Personal booking page management',
      color: 'blue'
    },
    {
      id: 'marketing-links', 
      name: 'Marketing Links',
      icon: LinkIcon,
      description: 'Campaign-specific booking links',
      color: 'green'
    },
    {
      id: 'qr-codes',
      name: 'QR Codes', 
      icon: QrCodeIcon,
      description: 'Generate and manage QR codes',
      color: 'purple'
    },
    {
      id: 'embed-widgets',
      name: 'Embed Widgets',
      icon: CodeBracketIcon, 
      description: 'Website embed codes and previews',
      color: 'indigo'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: ChartBarIcon,
      description: 'Unified booking analytics',
      color: 'orange'
    }
  ]

  const getTabColorClasses = (color, isActive) => {
    const colorMap = {
      blue: isActive 
        ? 'border-olive-500 text-olive-600 bg-olive-50' 
        : 'border-transparent text-gray-500 hover:text-olive-600 hover:border-olive-300',
      green: isActive 
        ? 'border-green-500 text-green-600 bg-green-50' 
        : 'border-transparent text-gray-500 hover:text-green-600 hover:border-green-300',
      purple: isActive 
        ? 'border-gold-500 text-gold-600 bg-gold-50' 
        : 'border-transparent text-gray-500 hover:text-gold-600 hover:border-gold-300',
      indigo: isActive 
        ? 'border-olive-500 text-olive-600 bg-indigo-50' 
        : 'border-transparent text-gray-500 hover:text-olive-600 hover:border-indigo-300',
      orange: isActive 
        ? 'border-orange-500 text-orange-600 bg-orange-50' 
        : 'border-transparent text-gray-500 hover:text-orange-600 hover:border-orange-300'
    }
    return colorMap[color] || colorMap.blue
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'public-page':
        return <PublicPageTab />
      case 'marketing-links':
        return <MarketingLinksTab />
      case 'qr-codes':
        return <QRCodesTab />
      case 'embed-widgets':
        return <EmbedWidgetsTab />
      case 'analytics':
        return <AnalyticsTab />
      default:
        return <PublicPageTab />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <LinkIcon className="h-8 w-8 text-olive-600" />
                  Booking Hub
                  <span className="text-sm font-medium bg-olive-100 text-olive-800 px-2 py-1 rounded-full">
                    All-in-One
                  </span>
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage all your booking links, QR codes, embeds, and public page in one place
                </p>
              </div>
              
              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-olive-600">3</div>
                  <div className="text-xs text-gray-500">Active Links</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">28</div>
                  <div className="text-xs text-gray-500">Total Clicks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gold-600">6</div>
                  <div className="text-xs text-gray-500">QR Codes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${getTabColorClasses(tab.color, isActive)} 
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 min-w-max`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                  {tab.id === 'marketing-links' && (
                    <span className="bg-moss-100 text-moss-900 text-xs px-2 py-1 rounded-full">3</span>
                  )}
                  {tab.id === 'qr-codes' && (
                    <span className="bg-gold-100 text-gold-800 text-xs px-2 py-1 rounded-full">6</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab Description */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-sm text-gray-600">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  )
}