'use client'

import { 
  Zap, 
  Settings, 
  CreditCard, 
  Shield, 
  Bell, 
  Info,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { TerminalManager } from '@/components/pos/TerminalManager'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export function TerminalSettings({ barbershopId }) {
  const [settings, setSettings] = useState({
    terminal_enabled: false,
    auto_capture: true,
    receipt_printing: true,
    notifications_enabled: true,
    test_mode: process.env.NODE_ENV === 'development',
    supported_payment_methods: ['card_present', 'contactless', 'apple_pay', 'google_pay'],
    platform_fee_percentage: 10.0,
    currency: 'usd'
  })
  const [loading, setLoading] = useState(false)
  const [testPaymentLoading, setTestPaymentLoading] = useState(false)
  const [stripeAccountStatus, setStripeAccountStatus] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    if (barbershopId) {
      loadSettings()
      loadStripeAccountStatus()
    }
  }, [barbershopId])

  const loadSettings = async () => {
    try {
      // Load Terminal settings from your backend
      // This would be implemented based on your existing settings API
      const response = await fetch(`/api/settings/terminal?barbershopId=${barbershopId}`)
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data.settings }))
      }
    } catch (error) {
      console.error('Error loading terminal settings:', error)
    }
  }

  const loadStripeAccountStatus = async () => {
    try {
      const response = await fetch(`/api/stripe/connect/account-status?barbershopId=${barbershopId}`)
      if (response.ok) {
        const data = await response.json()
        setStripeAccountStatus(data)
      }
    } catch (error) {
      console.error('Error loading Stripe account status:', error)
    }
  }

  const saveSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershopId,
          settings
        })
      })

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Terminal settings updated successfully",
          variant: "default"
        })
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving terminal settings:', error)
      toast({
        title: "Save Failed",
        description: "Failed to save terminal settings",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const runTestPayment = async () => {
    setTestPaymentLoading(true)
    try {
      // This would create a test payment intent for validation
      const response = await fetch('/api/stripe/terminal/test-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershopId,
          amount: 100 // $1.00 test
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Test Payment Created",
          description: `Test payment intent created: ${data.payment_intent.id}`,
          variant: "default"
        })
      } else {
        throw new Error('Test payment failed')
      }
    } catch (error) {
      console.error('Error running test payment:', error)
      toast({
        title: "Test Failed",
        description: "Failed to create test payment",
        variant: "destructive"
      })
    } finally {
      setTestPaymentLoading(false)
    }
  }

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const getAccountStatusBadge = () => {
    if (!stripeAccountStatus) {
      return <Badge variant="secondary">Loading...</Badge>
    }

    if (stripeAccountStatus.isOnboarded && stripeAccountStatus.chargesEnabled) {
      return <Badge variant="default" className="text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>
    }

    if (stripeAccountStatus.requirements?.currentlyDue?.length > 0) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Action Required</Badge>
    }

    return <Badge variant="secondary">Setup Required</Badge>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Stripe Terminal Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Stripe Account Status */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Stripe Account Status:</span>
                  {getAccountStatusBadge()}
                </div>
                {stripeAccountStatus && !stripeAccountStatus.isOnboarded && (
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Complete Setup
                  </Button>
                )}
              </div>
            </div>

            {/* Terminal Enable/Disable */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="terminal-enabled">Enable Terminal Payments</Label>
                <p className="text-sm text-gray-500">
                  Allow card-present payments using Stripe Terminal
                </p>
              </div>
              <input
                type="checkbox"
                id="terminal-enabled"
                checked={settings.terminal_enabled}
                onChange={(e) => updateSetting('terminal_enabled', e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            {/* Auto Capture */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-capture">Auto-Capture Payments</Label>
                <p className="text-sm text-gray-500">
                  Automatically capture payments when authorized
                </p>
              </div>
              <input
                type="checkbox"
                id="auto-capture"
                checked={settings.auto_capture}
                onChange={(e) => updateSetting('auto_capture', e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            {/* Platform Fee */}
            <div className="space-y-2">
              <Label htmlFor="platform-fee">Platform Fee Percentage</Label>
              <Input
                id="platform-fee"
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={settings.platform_fee_percentage}
                onChange={(e) => updateSetting('platform_fee_percentage', parseFloat(e.target.value) || 0)}
              />
              <p className="text-sm text-gray-500">
                Percentage fee charged on each transaction (0-30%)
              </p>
            </div>

            {/* Supported Payment Methods */}
            <div className="space-y-2">
              <Label>Supported Payment Methods</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'card_present', label: 'Card Present (Chip & PIN)' },
                  { key: 'contactless', label: 'Contactless (Tap)' },
                  { key: 'apple_pay', label: 'Apple Pay' },
                  { key: 'google_pay', label: 'Google Pay' }
                ].map(method => (
                  <div key={method.key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={method.key}
                      checked={settings.supported_payment_methods.includes(method.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateSetting('supported_payment_methods', [...settings.supported_payment_methods, method.key])
                        } else {
                          updateSetting('supported_payment_methods', 
                            settings.supported_payment_methods.filter(m => m !== method.key)
                          )
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={method.key} className="text-sm font-normal">
                      {method.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Mode */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="test-mode" className="font-medium">Test Mode</Label>
                    <input
                      type="checkbox"
                      id="test-mode"
                      checked={settings.test_mode}
                      onChange={(e) => updateSetting('test_mode', e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Test mode allows you to simulate terminal payments without processing real transactions.
                    {settings.test_mode ? ' Test mode is currently enabled.' : ' Test mode is disabled.'}
                  </p>
                  <Button
                    onClick={runTestPayment}
                    disabled={testPaymentLoading || !settings.terminal_enabled}
                    size="sm"
                    variant="outline"
                  >
                    {testPaymentLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                        Running Test...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Run Test Payment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Terminal Manager */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Hardware Management</h3>
              <TerminalManager barbershopId={barbershopId} />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 mt-6 border-t">
            <Button
              onClick={saveSettings}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}