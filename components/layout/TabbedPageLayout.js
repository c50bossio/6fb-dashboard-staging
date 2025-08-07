'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

import { Card } from '../ui'

export default function TabbedPageLayout({ 
  title, 
  description, 
  tabs, 
  defaultTab, 
  icon: TitleIcon,
  actions = null,
  fullWidth = false 
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  // Sync active tab with URL parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl && tabs.find(tab => tab.id === tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams, tabs])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    const url = new URL(window.location)
    url.searchParams.set('tab', tabId)
    router.push(url.pathname + url.search, { scroll: false })
  }

  const activeTabData = tabs.find(tab => tab.id === activeTab)

  return (
    <div className={`space-y-6 ${fullWidth ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
      {/* Page Header */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {TitleIcon && (
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <TitleIcon className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {description && (
                  <p className="mt-1 text-sm text-gray-500">{description}</p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center space-x-3">
                {actions}
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon && <tab.icon className="h-4 w-4" />}
                <span>{tab.name}</span>
                {tab.badge && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    activeTab === tab.id 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                {tab.isNew && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    New
                  </span>
                )}
                {tab.disabled && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    Coming Soon
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Tab Description */}
        {activeTabData?.description && (
          <Card className="bg-blue-50 border-blue-200">
            <div className="p-4">
              <div className="flex items-start space-x-3">
                {activeTabData.icon && (
                  <activeTabData.icon className="h-5 w-5 text-blue-600 mt-0.5" />
                )}
                <div>
                  <h3 className="text-sm font-medium text-blue-900">
                    {activeTabData.name}
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    {activeTabData.description}
                  </p>
                  {activeTabData.features && activeTabData.features.length > 0 && (
                    <ul className="mt-2 text-sm text-blue-600 space-y-1">
                      {activeTabData.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <div className="w-1 h-1 bg-blue-500 rounded-full mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Active Tab Content */}
        <div className="space-y-6">
          {activeTabData && activeTabData.component}
          
          {/* Tab is disabled */}
          {activeTabData?.disabled && (
            <Card>
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <activeTabData.icon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTabData.name} - Coming Soon
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  This feature is currently under development. Check back soon for updates!
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => handleTabChange(tabs.find(t => !t.disabled)?.id || tabs[0].id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Explore Available Features
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Tab Switcher (Mobile) */}
      <div className="lg:hidden">
        <select
          value={activeTab}
          onChange={(e) => handleTabChange(e.target.value)}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id} disabled={tab.disabled}>
              {tab.name} {tab.badge && `(${tab.badge})`}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// Helper component for tab content that needs loading states
export function TabContent({ loading, error, children, emptyState = null }) {
  if (loading) {
    return (
      <Card>
        <div className="animate-pulse p-6">
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-500 mb-4">
            {error.message || 'Failed to load content'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </Card>
    )
  }

  if (emptyState && !children) {
    return (
      <Card>
        <div className="text-center py-12">
          {emptyState}
        </div>
      </Card>
    )
  }

  return children
}

// Pre-built empty state components
export const EmptyStates = {
  NoData: ({ title = "No data available", description = "Get started by creating your first item.", action = null }) => (
    <div>
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{description}</p>
      {action}
    </div>
  ),
  
  ComingSoon: ({ title = "Coming Soon", description = "This feature is under development.", icon: Icon }) => (
    <div>
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
        {Icon ? <Icon className="w-8 h-8 text-blue-600" /> : (
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  )
}