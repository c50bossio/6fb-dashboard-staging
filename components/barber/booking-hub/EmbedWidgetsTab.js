'use client'

import { useState, useEffect } from 'react'
import { 
  CodeBracketIcon,
  PlusIcon,
  ClipboardIcon,
  CheckIcon,
  EyeIcon,
  GlobeAltIcon,
  CursorArrowRaysIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

export default function EmbedWidgetsTab() {
  const [embedWidgets, setEmbedWidgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    // Simulate loading embed widgets
    const timer = setTimeout(() => {
      const mockEmbedWidgets = [
        {
          id: 'embed-1',
          name: 'Website Homepage Widget',
          type: 'iframe',
          website: 'mybarbershop.com',
          embedCount: 1,
          clicks: 45,
          conversions: 8,
          createdAt: '2024-08-01',
          code: '<iframe src="http://localhost:9999/book/demo-barber/embed" width="100%" height="600"></iframe>'
        },
        {
          id: 'embed-2',
          name: 'Social Media Button',
          type: 'button',
          website: 'Instagram Bio',
          embedCount: 3,
          clicks: 67,
          conversions: 12,
          createdAt: '2024-08-03',
          code: '<a href="http://localhost:9999/book/demo-barber" class="booking-button">Book Now</a>'
        },
        {
          id: 'embed-3',
          name: 'JavaScript Widget',
          type: 'javascript',
          website: 'shopify-store.com',
          embedCount: 1,
          clicks: 23,
          conversions: 4,
          createdAt: '2024-08-05',
          code: '<script src="http://localhost:9999/booking-widget.js"></script>'
        },
        {
          id: 'embed-4',
          name: 'Email Signature Link',
          type: 'link',
          website: 'Email Signature',
          embedCount: 1,
          clicks: 89,
          conversions: 15,
          createdAt: '2024-08-07',
          code: 'http://localhost:9999/book/demo-barber?utm_source=email'
        }
      ]
      setEmbedWidgets(mockEmbedWidgets)
      setLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const copyToClipboard = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'iframe':
        return CodeBracketIcon
      case 'button':
        return CursorArrowRaysIcon
      case 'javascript':
        return GlobeAltIcon
      case 'link':
        return LinkIcon
      default:
        return CodeBracketIcon
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'iframe':
        return 'bg-blue-100 text-blue-800'
      case 'button':
        return 'bg-green-100 text-green-800'
      case 'javascript':
        return 'bg-purple-100 text-purple-800'
      case 'link':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="ml-4 text-gray-600">Loading embed widgets...</p>
      </div>
    )
  }

  const totalClicks = embedWidgets.reduce((sum, widget) => sum + widget.clicks, 0)
  const totalConversions = embedWidgets.reduce((sum, widget) => sum + widget.conversions, 0)
  const totalEmbeds = embedWidgets.reduce((sum, widget) => sum + widget.embedCount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Embed Widgets</h2>
          <p className="text-sm text-gray-600">Manage and track booking widgets embedded on external websites</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Widget
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CodeBracketIcon className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{embedWidgets.length}</div>
              <div className="text-xs text-gray-500">Widget Types</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <GlobeAltIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{totalEmbeds}</div>
              <div className="text-xs text-gray-500">Active Embeds</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <EyeIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{totalClicks}</div>
              <div className="text-xs text-gray-500">Total Clicks</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CursorArrowRaysIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {totalConversions} ({totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0}%)
              </div>
              <div className="text-xs text-gray-500">Conversions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Embed Widgets List */}
      <div className="space-y-4">
        {embedWidgets.map((widget) => {
          const TypeIcon = getTypeIcon(widget.type)
          
          return (
            <div key={widget.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <TypeIcon className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{widget.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(widget.type)}`}>
                      {widget.type.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <GlobeAltIcon className="h-4 w-4" />
                      <span>{widget.website}</span>
                    </div>
                    <div className="text-gray-400">•</div>
                    <div>{widget.embedCount} active embed{widget.embedCount !== 1 ? 's' : ''}</div>
                    <div className="text-gray-400">•</div>
                    <div>Created {widget.createdAt}</div>
                  </div>

                  {/* Code Preview */}
                  <div className="bg-gray-900 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">Embed Code</span>
                      <button
                        onClick={() => copyToClipboard(widget.code, widget.id)}
                        className="inline-flex items-center px-3 py-1 border border-gray-600 text-sm font-medium rounded text-gray-300 hover:bg-gray-800"
                      >
                        {copiedId === widget.id ? (
                          <>
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <ClipboardIcon className="h-4 w-4 mr-1" />
                            Copy Code
                          </>
                        )}
                      </button>
                    </div>
                    <code className="text-sm text-gray-300 font-mono break-all">
                      {widget.code}
                    </code>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{widget.clicks}</div>
                      <div className="text-xs text-gray-500">Clicks</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{widget.conversions}</div>
                      <div className="text-xs text-gray-500">Bookings</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {widget.clicks > 0 ? ((widget.conversions / widget.clicks) * 100).toFixed(1) : 0}%
                      </div>
                      <div className="text-xs text-gray-500">Conversion</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 ml-6">
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50">
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Preview
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Widget Types Guide */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <CodeBracketIcon className="h-6 w-6 text-indigo-600" />
          <h3 className="font-semibold text-indigo-900">Widget Types Available</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CodeBracketIcon className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">iFrame</span>
            </div>
            <p className="text-sm text-gray-600">Full booking form embedded directly in your website</p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CursorArrowRaysIcon className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Button</span>
            </div>
            <p className="text-sm text-gray-600">Customizable booking button with popup or redirect</p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <GlobeAltIcon className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">JavaScript</span>
            </div>
            <p className="text-sm text-gray-600">Dynamic widget with auto-resize and themes</p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-orange-900">Link</span>
            </div>
            <p className="text-sm text-gray-600">Direct booking link for social media and emails</p>
          </div>
        </div>
      </div>
    </div>
  )
}