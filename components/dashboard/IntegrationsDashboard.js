'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge, StatusBadge } from '../ui/Badge'
import { DataTable } from '../ui/Table'
import { Modal, ModalContent, ModalFooter } from '../ui/Modal'
import { PageWrapper } from '../layout/Layout'
import { cn, formatDate } from '../../lib/utils'

// Mock integration data
const mockIntegrations = [
  {
    id: 1,
    name: 'Trafft',
    type: 'booking',
    status: 'connected',
    description: 'Complete booking management platform',
    logo: '📅',
    lastSync: '2024-01-15T10:30:00Z',
    syncStatus: 'success',
    totalBookings: 145,
    monthlyBookings: 32,
    features: ['Online Booking', 'Payment Processing', 'Client Management', 'SMS Notifications'],
    health: 'excellent',
    uptime: 99.8,
    responseTime: 320
  },
  {
    id: 2,
    name: 'Square',
    type: 'payment',
    status: 'connected',
    description: 'Payment processing and POS system',
    logo: '💳',
    lastSync: '2024-01-15T10:25:00Z',
    syncStatus: 'success',
    totalBookings: 89,
    monthlyBookings: 28,
    features: ['Payment Processing', 'POS System', 'Inventory Management', 'Reports'],
    health: 'good',
    uptime: 99.5,
    responseTime: 450
  },
  {
    id: 3,
    name: 'Acuity Scheduling',
    type: 'booking',
    status: 'connected',
    description: 'Professional scheduling and appointment booking',
    logo: '⏰',
    lastSync: '2024-01-15T09:45:00Z',
    syncStatus: 'warning',
    totalBookings: 76,
    monthlyBookings: 18,
    features: ['Appointment Scheduling', 'Calendar Sync', 'Client Intake Forms', 'Package Management'],
    health: 'warning',
    uptime: 98.2,
    responseTime: 680
  },
  {
    id: 4,
    name: 'Google Calendar',
    type: 'calendar',
    status: 'syncing',
    description: 'Calendar synchronization and scheduling',
    logo: '📅',
    lastSync: '2024-01-15T10:35:00Z',
    syncStatus: 'syncing',
    totalBookings: 0,
    monthlyBookings: 0,
    features: ['Calendar Sync', 'Event Management', 'Reminders', 'Team Scheduling'],
    health: 'syncing',
    uptime: 99.9,
    responseTime: 180
  },
  {
    id: 5,
    name: 'Mindbody',
    type: 'booking',
    status: 'error',
    description: 'Wellness and fitness business management',
    logo: '🧘',
    lastSync: '2024-01-15T08:20:00Z',
    syncStatus: 'error',
    totalBookings: 0,
    monthlyBookings: 0,
    features: ['Class Scheduling', 'Membership Management', 'Payment Processing', 'Mobile App'],
    health: 'error',
    uptime: 85.3,
    responseTime: 1200,
    error: 'Authentication failed - API key expired'
  }
]

// Available integrations to add
const availableIntegrations = [
  {
    name: 'Calendly',
    type: 'booking',
    description: 'Simple and elegant appointment scheduling',
    logo: '📆',
    features: ['Easy Scheduling', 'Calendar Integration', 'Automated Reminders', 'Team Scheduling']
  },
  {
    name: 'Stripe',
    type: 'payment',
    description: 'Advanced payment processing platform',
    logo: '💰',
    features: ['Online Payments', 'Subscription Management', 'Advanced Analytics', 'Fraud Protection']
  },
  {
    name: 'Mailchimp',
    type: 'marketing',
    description: 'Email marketing and automation platform',
    logo: '📧',
    features: ['Email Campaigns', 'Marketing Automation', 'Customer Segmentation', 'Analytics']
  },
  {
    name: 'Zendesk',
    type: 'support',
    description: 'Customer support and ticketing system',
    logo: '🎧',
    features: ['Help Desk', 'Live Chat', 'Knowledge Base', 'Customer Analytics']
  }
]

// Integration Card Component
const IntegrationCard = ({ integration, onConfigure, onDisconnect }) => {
  const getHealthColor = (health) => {
    const colors = {
      excellent: 'text-success-600 bg-success-100',
      good: 'text-success-600 bg-success-100',
      warning: 'text-warning-600 bg-warning-100',
      error: 'text-error-600 bg-error-100',
      syncing: 'text-brand-600 bg-brand-100'
    }
    return colors[health] || 'text-gray-600 bg-gray-100'
  }

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{integration.logo}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {integration.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {integration.description}
              </p>
            </div>
          </div>
          <StatusBadge status={integration.status} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Bookings</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {integration.totalBookings}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {integration.monthlyBookings}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Uptime</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {integration.uptime}%
            </p>
          </div>
        </div>

        {/* Health Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Health:</span>
            <Badge className={getHealthColor(integration.health)} size="sm">
              {integration.health}
            </Badge>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Last sync: {formatDate(integration.lastSync, 'MMM dd, HH:mm')}
          </div>
        </div>

        {/* Error Message */}
        {integration.error && (
          <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
            <p className="text-sm text-error-700 dark:text-error-300">
              {integration.error}
            </p>
          </div>
        )}

        {/* Features */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Features</p>
          <div className="flex flex-wrap gap-1">
            {integration.features.slice(0, 3).map((feature, index) => (
              <Badge key={index} variant="outline" size="sm">
                {feature}
              </Badge>
            ))}
            {integration.features.length > 3 && (
              <Badge variant="outline" size="sm">
                +{integration.features.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline" 
            size="sm" 
            onClick={() => onConfigure(integration)}
            className="flex-1"
          >
            Configure
          </Button>
          {integration.status === 'error' ? (
            <Button variant="primary" size="sm" className="flex-1">
              Reconnect
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDisconnect(integration)}
              className="flex-1"
            >
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Available Integration Card
const AvailableIntegrationCard = ({ integration, onConnect }) => (
  <Card className="hover:shadow-md transition-all duration-200 border-dashed">
    <CardContent className="p-6">
      <div className="text-center">
        <div className="text-4xl mb-4">{integration.logo}</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {integration.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {integration.description}
        </p>
        
        <div className="flex flex-wrap gap-1 justify-center mb-4">
          {integration.features.slice(0, 2).map((feature, index) => (
            <Badge key={index} variant="outline" size="sm">
              {feature}
            </Badge>
          ))}
        </div>
        
        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => onConnect(integration)}
          className="w-full"
        >
          Connect
        </Button>
      </div>
    </CardContent>
  </Card>
)

// Main Integrations Dashboard Component
const IntegrationsDashboard = () => {
  const [integrations] = useState(mockIntegrations)
  const [availableApps] = useState(availableIntegrations)
  const [selectedIntegration, setSelectedIntegration] = useState(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)

  const handleConfigure = (integration) => {
    setSelectedIntegration(integration)
    setShowConfigModal(true)
  }

  const handleDisconnect = (integration) => {
    // Handle disconnect logic
    console.log('Disconnecting:', integration.name)
  }

  const handleConnect = (integration) => {
    setSelectedIntegration(integration)
    setShowConnectModal(true)
  }

  // Sync history table columns
  const syncHistoryColumns = [
    {
      accessorKey: 'name',
      header: 'Integration',
      cell: ({ value, row }) => (
        <div className="flex items-center space-x-2">
          <span className="text-lg">{row.logo}</span>
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      accessorKey: 'lastSync',
      header: 'Last Sync',
      type: 'date'
    },
    {
      accessorKey: 'syncStatus',
      header: 'Status',
      cell: ({ value }) => <StatusBadge status={value} />
    },
    {
      accessorKey: 'monthlyBookings',
      header: 'Monthly Bookings',
      align: 'right'
    },
    {
      accessorKey: 'responseTime',
      header: 'Response Time',
      cell: ({ value }) => `${value}ms`,
      align: 'right'
    }
  ]

  return (
    <PageWrapper
      title="Integrations"
      description="Manage your platform connections and data synchronization"
      action={
        <Button>
          View All Available
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Connected
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {integrations.filter(i => i.status === 'connected').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success-100 dark:bg-success-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-success-600 dark:text-success-400 text-xl">✅</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Total Bookings
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {integrations.reduce((sum, i) => sum + i.totalBookings, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-brand-600 dark:text-brand-400 text-xl">📊</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Avg Uptime
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(integrations.reduce((sum, i) => sum + i.uptime, 0) / integrations.length).toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-warning-600 dark:text-warning-400 text-xl">⚡</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Issues
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {integrations.filter(i => i.status === 'error').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-error-100 dark:bg-error-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-error-600 dark:text-error-400 text-xl">⚠️</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connected Integrations */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Connected Integrations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConfigure={handleConfigure}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </div>

        {/* Available Integrations */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Available Integrations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {availableApps.map((integration, index) => (
              <AvailableIntegrationCard
                key={index}
                integration={integration}
                onConnect={handleConnect}
              />
            ))}
          </div>
        </div>

        {/* Sync History */}
        <DataTable
          data={integrations}
          columns={syncHistoryColumns}
          title="Sync History"
          description="Recent synchronization activity across all integrations"
          searchable={true}
          pageSize={8}
        />
      </div>

      {/* Configuration Modal */}
      {showConfigModal && selectedIntegration && (
        <Modal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          title={`Configure ${selectedIntegration.name}`}
          size="lg"
        >
          <ModalContent>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Configure settings for {selectedIntegration.name} integration.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Current Settings
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Status:</span>
                    <StatusBadge status={selectedIntegration.status} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Last Sync:</span>
                    <span>{formatDate(selectedIntegration.lastSync)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Uptime:</span>
                    <span>{selectedIntegration.uptime}%</span>
                  </div>
                </div>
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowConfigModal(false)}>
              Save Changes
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Connect Modal */}
      {showConnectModal && selectedIntegration && (
        <Modal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          title={`Connect ${selectedIntegration.name}`}
          size="md"
        >
          <ModalContent>
            <div className="text-center space-y-4">
              <div className="text-6xl">{selectedIntegration.logo}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Connect to {selectedIntegration.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {selectedIntegration.description}
              </p>
              
              <div className="bg-brand-50 dark:bg-brand-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-brand-900 dark:text-brand-100 mb-2">
                  What you'll get:
                </h4>
                <ul className="text-sm text-brand-700 dark:text-brand-300 space-y-1">
                  {selectedIntegration.features.map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowConnectModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowConnectModal(false)}>
              Connect Now
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </PageWrapper>
  )
}

export default IntegrationsDashboard