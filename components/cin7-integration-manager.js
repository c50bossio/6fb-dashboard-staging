'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser-client'
import { useRouter } from 'next/navigation'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * CIN7 Integration Manager Component
 * 
 * Provides complete management interface for CIN7 API integration:
 * - Save/Edit/Delete credentials
 * - Real-time connection status
 * - Manual sync triggers
 * - Automatic webhook setup
 * - Sync history and monitoring
 */
export default function Cin7IntegrationManager({ onConnectionChange, onClose }) {
  const [credentials, setCredentials] = useState({
    accountId: '',
    apiKey: '',
    accountName: ''
  })
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [syncStatus, setSyncStatus] = useState(null)
  const [webhookStatus, setWebhookStatus] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [syncHistory, setSyncHistory] = useState([])
  
  const router = useRouter()
  const supabase = createClient()

  // Load existing credentials and status on mount
  useEffect(() => {
    loadCredentialsAndStatus()
    loadSyncHistory()
    setupRealtimeSubscription()
  }, [])

  // Load saved credentials and connection status
  async function loadCredentialsAndStatus() {
    setIsLoading(true)
    try {
      // Check connection status
      const statusRes = await fetch('/api/cin7/status')
      const status = await statusRes.json()
      setIsConnected(status.connected)
      
      // Load credentials if connected
      if (status.connected) {
        const credRes = await fetch('/api/cin7/credentials')
        if (credRes.ok) {
          const savedCreds = await credRes.json()
          setCredentials({
            accountId: '••••••••',  // Masked for security
            apiKey: '••••••••',     // Masked for security
            accountName: savedCreds.account_name || 'Connected'
          })
          setLastSync(savedCreds.last_sync)
          setSyncStatus(savedCreds.last_sync_status)
          setWebhookStatus(savedCreds.webhook_status)
        }
      }
      
      // Notify parent component of connection status
      if (onConnectionChange) {
        onConnectionChange(status.connected)
      }
    } catch (error) {
      console.error('Failed to load credentials:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load sync history
  async function loadSyncHistory() {
    try {
      const { data: history } = await supabase
        .from('sale_syncs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10)
      
      if (history) {
        setSyncHistory(history)
      }
    } catch (error) {
      console.error('Failed to load sync history:', error)
    }
  }

  // Setup real-time subscription for sync updates
  function setupRealtimeSubscription() {
    const subscription = supabase
      .channel('cin7-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'sale_syncs' },
        payload => {
          setSyncHistory(prev => [payload.new, ...prev.slice(0, 9)])
          setMessage({ 
            type: 'success', 
            text: `Sale synced: ${payload.new.bookbarber_sale_id}` 
          })
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inventory_alerts' },
        payload => {
          if (payload.new.alert_type === 'out_of_stock') {
            setMessage({
              type: 'warning',
              text: `Out of Stock: ${payload.new.product_name}`
            })
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  // Save or update credentials
  async function saveCredentials(e) {
    e.preventDefault()
    setIsLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Test connection first
      const testRes = await fetch('/api/cin7/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: credentials.accountId,
          apiKey: credentials.apiKey
        })
      })

      const testResult = await testRes.json()
      
      if (!testResult.success) {
        setMessage({ 
          type: 'error', 
          text: testResult.message || 'Invalid credentials' 
        })
        setIsLoading(false)
        return
      }

      // Save credentials
      const saveRes = await fetch('/api/cin7/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: credentials.accountId,
          apiKey: credentials.apiKey,
          accountName: testResult.accountName
        })
      })

      if (!saveRes.ok) {
        throw new Error('Failed to save credentials')
      }

      // Register webhooks automatically
      await registerWebhooks()

      // Run initial sync
      await runManualSync()

      setIsConnected(true)
      setEditMode(false)
      setMessage({ 
        type: 'success', 
        text: 'CIN7 integration configured successfully! Real-time sync is now active.' 
      })

      // Notify parent component
      if (onConnectionChange) {
        onConnectionChange(true)
      }

      // Reload status
      await loadCredentialsAndStatus()
      
    } catch (error) {
      console.error('Save credentials error:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to save credentials: ' + error.message 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Register webhooks with CIN7
  async function registerWebhooks() {
    try {
      const res = await fetch('/api/cin7/webhooks/register', {
        method: 'POST'
      })
      
      const result = await res.json()
      
      if (result.success) {
        setWebhookStatus('active')
        console.log('Webhooks registered successfully')
      } else {
        console.error('Webhook registration failed:', result.error)
        setWebhookStatus('error')
      }
    } catch (error) {
      console.error('Webhook registration error:', error)
      setWebhookStatus('error')
    }
  }

  // Run manual sync
  async function runManualSync() {
    setIsSyncing(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch('/api/cin7/sync', {
        method: 'POST'
      })

      const result = await res.json()

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Sync complete! ${result.count} products updated.` 
        })
        setSyncStatus('success')
        setLastSync(new Date().toISOString())
        
        // Refresh the page to show updated inventory
        router.refresh()
      } else {
        throw new Error(result.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Manual sync error:', error)
      setMessage({ 
        type: 'error', 
        text: 'Sync failed: ' + error.message 
      })
      setSyncStatus('failed')
    } finally {
      setIsSyncing(false)
    }
  }

  // Delete integration
  async function deleteIntegration() {
    setIsLoading(true)
    
    try {
      const res = await fetch('/api/cin7/credentials', {
        method: 'DELETE'
      })

      if (res.ok) {
        setIsConnected(false)
        setCredentials({ accountId: '', apiKey: '', accountName: '' })
        setMessage({ 
          type: 'success', 
          text: 'CIN7 integration removed successfully' 
        })
        setShowDeleteDialog(false)
        setSyncStatus(null)
        setWebhookStatus(null)
        setLastSync(null)
        
        // Notify parent component
        if (onConnectionChange) {
          onConnectionChange(false)
        }
      } else {
        throw new Error('Failed to delete integration')
      }
    } catch (error) {
      console.error('Delete integration error:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to remove integration: ' + error.message 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Format date for display
  function formatDate(dateString) {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Get status badge color
  function getStatusColor(status) {
    switch (status) {
      case 'success':
      case 'active':
        return 'bg-green-500'
      case 'failed':
      case 'error':
        return 'bg-red-500'
      case 'pending':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>CIN7 Integration</CardTitle>
              <CardDescription>
                Manage your inventory sync with CIN7
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <>
                  <Badge className={getStatusColor('active')}>
                    Connected
                  </Badge>
                  {webhookStatus === 'active' && (
                    <Badge className="bg-blue-500">
                      Real-time Active
                    </Badge>
                  )}
                </>
              )}
              {!isConnected && (
                <Badge variant="outline">Disconnected</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {message.text && (
            <Alert className={`mb-4 ${
              message.type === 'error' ? 'border-red-500' : 
              message.type === 'warning' ? 'border-yellow-500' : 
              'border-green-500'
            }`}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {!isConnected || editMode ? (
            // Credential Form
            <form onSubmit={saveCredentials} className="space-y-4">
              <div>
                <Label htmlFor="accountId">Account ID</Label>
                <Input
                  id="accountId"
                  type="text"
                  value={credentials.accountId}
                  onChange={(e) => setCredentials({
                    ...credentials,
                    accountId: e.target.value
                  })}
                  placeholder="Enter your CIN7 Account ID"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={credentials.apiKey}
                  onChange={(e) => setCredentials({
                    ...credentials,
                    apiKey: e.target.value
                  })}
                  placeholder="Enter your CIN7 API Key"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Connecting...' : 'Connect to CIN7'}
                </Button>
                {editMode && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditMode(false)
                      loadCredentialsAndStatus()
                      if (onClose) {
                        onClose()
                      }
                    }}
                  >
                    Cancel
                  </Button>
                )}
                {!isConnected && !editMode && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (onClose) {
                        onClose()
                      }
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          ) : (
            // Connected View
            <Tabs defaultValue="status" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="status">Status</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="status" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Account</p>
                    <p className="font-medium">{credentials.accountName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Sync</p>
                    <p className="font-medium">{formatDate(lastSync)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sync Status</p>
                    <Badge className={getStatusColor(syncStatus)}>
                      {syncStatus || 'Unknown'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Webhooks</p>
                    <Badge className={getStatusColor(webhookStatus)}>
                      {webhookStatus || 'Unknown'}
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Button 
                    onClick={runManualSync}
                    disabled={isSyncing}
                    className="w-full"
                  >
                    {isSyncing ? 'Syncing...' : 'Run Manual Sync'}
                  </Button>
                  {onClose && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="w-full"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-2">
                {syncHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No sync history yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {syncHistory.map((sync) => (
                      <div 
                        key={sync.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {sync.bookbarber_sale_id || 'Manual Sync'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(sync.timestamp)}
                          </p>
                        </div>
                        <Badge className={getStatusColor(sync.sync_status)}>
                          {sync.sync_status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-2">
                  <Button 
                    variant="outline"
                    onClick={() => setEditMode(true)}
                    className="w-full"
                  >
                    Edit Credentials
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={registerWebhooks}
                    className="w-full"
                  >
                    Re-register Webhooks
                  </Button>
                  
                  <Button 
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full"
                  >
                    Delete Integration
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
      <AlertDialog open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CIN7 Integration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your CIN7 credentials and stop all automatic 
              inventory syncing. You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteIntegration}>
              Delete Integration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}
    </div>
  )
}