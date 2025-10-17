'use client'

import { 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Key,
  RefreshCw,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/UnifiedInput'

export default function SimplifiedCin7Setup({ onComplete }) {
  const [credentials, setCredentials] = useState({
    accountId: '',
    apiKey: ''
  })
  const [status, setStatus] = useState('idle') // idle, testing, syncing, success, error
  const [error, setError] = useState(null)
  const [syncResult, setSyncResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check for credentials in environment or localStorage
    const storedAccountId = localStorage.getItem('cin7_account_id')
    const storedApiKey = localStorage.getItem('cin7_api_key')
    
    if (storedAccountId && storedApiKey) {
      setCredentials({
        accountId: storedAccountId,
        apiKey: storedApiKey
      })
    }
  }, [])

  const validateCredentials = () => {
    if (!credentials.accountId || !credentials.apiKey) {
      setError('Please enter both Account ID and API Key')
      return false
    }
    
    // Basic format validation
    const accountIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
    if (!accountIdPattern.test(credentials.accountId)) {
      setError('Account ID should be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
      return false
    }
    
    if (credentials.apiKey.length < 20) {
      setError('API Key seems too short. Please check it\'s complete.')
      return false
    }
    
    return true
  }

  const handleTestConnection = async () => {
    if (!validateCredentials()) return
    
    setIsLoading(true)
    setStatus('testing')
    setError(null)
    
    try {
      const response = await fetch('/api/cin7/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-bypass': 'true'
        },
        body: JSON.stringify(credentials)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 403 && data.message) {
          // Display the detailed error message from the API
          setError(
            <div className="space-y-3">
              <p className="font-semibold text-red-600">{data.error}</p>
              <div className="text-sm space-y-1 whitespace-pre-wrap">
                {data.message}
              </div>
              {data.details && (
                <div className="text-xs text-gray-500 mt-2">
                  API Response: {data.details}
                </div>
              )}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => window.open('https://inventory.dearsystems.com/ExternalAPI', '_blank')}
              >
                Open CIN7 API Settings <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )
        } else if (response.status === 403) {
          setError(
            <div className="space-y-2">
              <p>Invalid credentials or API access disabled.</p>
              <div className="text-sm space-y-1">
                <p>• Check your credentials are correct</p>
                <p>• Verify API access is enabled in CIN7</p>
                <p>• Ensure your API key hasn't expired</p>
              </div>
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => window.open('https://inventory.dearsystems.com/Settings', '_blank')}
              >
                Open CIN7 Settings <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )
        } else {
          setError(data.error || 'Connection test failed')
        }
        setStatus('error')
      } else {
        setStatus('idle')
        // Connection successful, save credentials first, then sync
        await saveCredentialsAndSync()
      }
    } catch (err) {
      setError('Network error. Please check your connection.')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const saveCredentialsAndSync = async () => {
    setIsLoading(true)
    setStatus('syncing')
    setError(null)
    
    try {
      // Store credentials locally for dev mode
      localStorage.setItem('cin7_account_id', credentials.accountId)
      localStorage.setItem('cin7_api_key', credentials.apiKey)
      
      // First, save credentials to database via setup endpoint
      const setupResponse = await fetch('/api/cin7/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-bypass': 'true'
        },
        body: JSON.stringify({
          accountId: credentials.accountId,
          apiKey: credentials.apiKey,
          accountName: 'Manual Setup',
          options: {
            performInitialSync: false // We'll do sync separately
          }
        })
      })
      
      
      if (!setupResponse.ok) {
        const setupData = await setupResponse.json()
        setError(setupData.error || 'Failed to save credentials')
        setStatus('error')
        return
      }
      
      // Now perform the sync
      const syncResponse = await fetch('/api/cin7/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-bypass': 'true'
        },
        body: JSON.stringify({
          accountId: credentials.accountId,
          apiKey: credentials.apiKey,
          accountName: 'Manual Setup'
        })
      })
      
      
      const syncData = await syncResponse.json()
      
      if (!syncResponse.ok) {
        setError(syncData.error || 'Sync failed')
        setStatus('error')
      } else {
        setSyncResult(syncData)
        setStatus('success')
        if (onComplete) {
          setTimeout(() => onComplete(syncData), 2000)
        }
      }
    } catch (err) {
      setError('Setup and sync failed. Please try again.')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    // This is now called by saveCredentialsAndSync
    await saveCredentialsAndSync()
  }

  const getHelpText = () => {
    switch (status) {
      case 'testing':
        return 'Testing your CIN7 connection...'
      case 'syncing':
        return 'Syncing products from CIN7...'
      case 'success':
        return `Successfully synced ${syncResult?.count || 0} products!`
      case 'error':
        return 'Please fix the errors and try again'
      default:
        return 'Enter your CIN7 API credentials to sync inventory'
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle>CIN7 Inventory Setup</CardTitle>
              <CardDescription>{getHelpText()}</CardDescription>
            </div>
          </div>
          {status === 'success' && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Credentials Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountId">
              Account ID
              <span className="text-xs text-muted-foreground ml-2">
                (Found in CIN7 → Settings → API)
              </span>
            </Label>
            <Input
              id="accountId"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={credentials.accountId}
              onChange={(e) => setCredentials({ ...credentials, accountId: e.target.value })}
              disabled={isLoading}
              className="font-mono text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Application Key
              <span className="text-xs text-muted-foreground ml-2">
                (Keep this secret)
              </span>
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Your CIN7 API key"
              value={credentials.apiKey}
              onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
              disabled={isLoading}
              className="font-mono text-sm"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {status === 'success' && syncResult && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Sync Complete!</AlertTitle>
            <AlertDescription className="text-green-700">
              <div className="space-y-1 mt-2">
                <p>• {syncResult.count} products synchronized</p>
                {syncResult.lowStockCount > 0 && (
                  <p>• {syncResult.lowStockCount} products with low stock</p>
                )}
                {syncResult.outOfStockCount > 0 && (
                  <p>• {syncResult.outOfStockCount} products out of stock</p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Help Text */}
        {status === 'idle' && !error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Need your CIN7 credentials?</AlertTitle>
            <AlertDescription>
              <ol className="mt-2 space-y-1 text-sm">
                <li>1. Log in to your CIN7 account</li>
                <li>2. Go to Settings → API</li>
                <li>3. Copy your Account ID and API Key</li>
                <li>4. Make sure API access is enabled</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleTestConnection}
            disabled={isLoading || !credentials.accountId || !credentials.apiKey}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {status === 'testing' ? 'Testing...' : 'Syncing...'}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Test & Sync
              </>
            )}
          </Button>
          
          {status === 'success' && (
            <Button
              variant="outline"
              onClick={() => window.location.href = '/inventory'}
            >
              View Inventory
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}