'use client'

import { 
  SparklesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'

import TabbedPageLayout from '../../../../components/layout/TabbedPageLayout'
import { Card } from '../../../../components/ui'

// Demo content components
const BeforeAfter = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Before */}
      <Card className="bg-red-50 border-red-200">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="h-6 w-6 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✕</span>
            </div>
            <h3 className="text-lg font-semibold text-red-900">Before: Cluttered Navigation</h3>
          </div>
          
          <div className="space-y-3">
            <div className="text-sm text-red-800 space-y-1">
              <p className="font-medium">Main Navigation Issues:</p>
              <ul className="space-y-1 ml-4">
                <li>• 10+ primary navigation items</li>
                <li>• Multiple duplicate booking pages</li>
                <li>• Scattered AI features</li>
                <li>• No clear hierarchy</li>
                <li>• Developer debug pages mixed in</li>
              </ul>
            </div>
            
            <div className="bg-white border border-red-200 rounded p-3">
              <p className="text-xs font-mono text-red-700">
                Dashboard | Appointments | Customers | Staff | Payments | Analytics | AI Agents | Advanced RAG | Admin: AI Knowledge | Settings
              </p>
            </div>
            
            <div className="text-sm text-red-800 space-y-1">
              <p className="font-medium">Problems:</p>
              <ul className="space-y-1 ml-4">
                <li>• Cognitive overload</li>
                <li>• Hard to find features</li>
                <li>• Inconsistent organization</li>
                <li>• Mobile unfriendly</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* After */}
      <Card className="bg-green-50 border-green-200">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">After: Organized Hierarchy</h3>
          </div>
          
          <div className="space-y-3">
            <div className="text-sm text-green-800 space-y-1">
              <p className="font-medium">Clean Navigation Structure:</p>
              <ul className="space-y-1 ml-4">
                <li>• 5 main categories</li>
                <li>• Expandable subcategories</li>
                <li>• Tabbed page organization</li>
                <li>• Clear visual hierarchy</li>
                <li>• Mobile optimized</li>
              </ul>
            </div>
            
            <div className="bg-white border border-green-200 rounded p-3 space-y-2">
              <div className="text-xs font-mono text-green-700">
                📊 Overview → Dashboard, Real-time Status
              </div>
              <div className="text-xs font-mono text-green-700">
                ✨ AI Tools → Complete AI toolkit
              </div>
              <div className="text-xs font-mono text-green-700">
                📈 Business → Bookings, Customers, Analytics
              </div>
              <div className="text-xs font-mono text-green-700">
                ⚙️ Platform → Settings, Billing, Notifications
              </div>
              <div className="text-xs font-mono text-green-700">
                ℹ️ Company → About, Docs, Support
              </div>
            </div>
            
            <div className="text-sm text-green-800 space-y-1">
              <p className="font-medium">Benefits:</p>
              <ul className="space-y-1 ml-4">
                <li>• Easy to navigate</li>
                <li>• Reduced cognitive load</li>
                <li>• Better discoverability</li>
                <li>• Responsive design</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
)

const KeyFeatures = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-olive-100 rounded-lg flex items-center justify-center">
              <SparklesIcon className="h-6 w-6 text-olive-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Collapsible Sidebar</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Expandable categories with smooth animations. Collapse to icons-only for more workspace.
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Click categories to expand/collapse</li>
            <li>• Visual hierarchy with indentation</li>
            <li>• Active state highlighting</li>
            <li>• Persistent collapse state</li>
          </ul>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-gold-100 rounded-lg flex items-center justify-center">
              <CpuChipIcon className="h-6 w-6 text-gold-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Tabbed Pages</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Complex functionality organized into logical tabs with descriptions and features.
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• URL-synced tab states</li>
            <li>• Loading states for each tab</li>
            <li>• Mobile-friendly tab switching</li>
            <li>• Contextual help and descriptions</li>
          </ul>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Smart Organization</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Features grouped by purpose with progressive disclosure of advanced options.
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Role-based navigation visibility</li>
            <li>• Breadcrumb navigation</li>
            <li>• Quick search functionality</li>
            <li>• Recent pages access</li>
          </ul>
        </div>
      </Card>
    </div>

    {/* Example Navigation Flow */}
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Example: Unified Booking System</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-4 w-4" />
            <span>Business</span>
          </div>
          <ArrowRightIcon className="h-4 w-4" />
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-4 w-4" />
            <span>Bookings</span>
          </div>
          <ArrowRightIcon className="h-4 w-4" />
          <div className="bg-olive-50 px-2 py-1 rounded text-olive-800">
            AI Enhanced | Calendar View | Simple View | Analytics | Settings
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          Instead of 8 separate booking pages, everything is organized into one unified interface with 5 logical tabs.
        </p>
      </div>
    </Card>
  </div>
)

const Implementation = () => (
  <div className="space-y-6">
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Implementation</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Core Components</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-xs text-gray-700">
{`components/
├── navigation/
│   ├── HierarchicalSidebar.js     # Main sidebar component
│   └── NavigationConfig.js        # Navigation structure
├── layout/
│   └── TabbedPageLayout.js        # Reusable tabbed interface
└── ui/
    └── [various UI components]    # Shared components`}
              </pre>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Key Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Navigation</h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• State management for expanded categories</li>
                  <li>• URL-based active state detection</li>
                  <li>• Mobile-first responsive design</li>
                  <li>• Breadcrumb generation</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Tabbed Pages</h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• URL synchronization</li>
                  <li>• Lazy loading of tab content</li>
                  <li>• Loading and error states</li>
                  <li>• Contextual help system</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Hierarchical Sidebar</span>
            </div>
            <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">Complete</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Tabbed Page Layout</span>
            </div>
            <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">Complete</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Unified Booking System</span>
            </div>
            <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">Complete</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">AI Tools Hub</span>
            </div>
            <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">Complete</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-olive-50 border border-olive-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 bg-olive-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-olive-900">Mobile Optimization</span>
            </div>
            <span className="text-xs text-olive-700 bg-olive-100 px-2 py-1 rounded">In Progress</span>
          </div>
        </div>
      </div>
    </Card>
  </div>
)

export default function NavigationDemoPage() {
  const demoTabs = [
    {
      id: 'overview',
      name: 'Before & After',
      icon: SparklesIcon,
      description: 'Compare the old cluttered navigation with the new organized structure.',
      component: <BeforeAfter />
    },
    {
      id: 'features',
      name: 'Key Features',
      icon: CheckCircleIcon,
      description: 'Explore the main features of the new navigation system.',
      component: <KeyFeatures />
    },
    {
      id: 'implementation',
      name: 'Implementation',
      icon: CpuChipIcon,
      description: 'Technical details and current implementation status.',
      component: <Implementation />
    }
  ]

  return (
    <TabbedPageLayout
      title="Navigation System Demo"
      description="New hierarchical navigation with organized categories and tabbed interfaces"
      icon={SparklesIcon}
      tabs={demoTabs}
      defaultTab="overview"
    />
  )
}