'use client'

import { format, formatDistance, parseISO } from 'date-fns'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  FileText,
  Edit,
  Save,
  X,
  ExternalLink,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/Separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import PayoutStatusIndicator from './PayoutStatusIndicator'

/**
 * Comprehensive Payout Transaction Details Modal
 * Features:
 * - Complete transaction information
 * - Status update timeline
 * - Commission breakdown
 * - Reconciliation data
 * - Admin actions (status updates, notes)
 * - Export individual transaction
 */
export default function PayoutTransactionDetails({ 
  payout, 
  onClose, 
  onStatusUpdate, 
  canEdit = false 
}) {
  const [loading, setLoading] = useState(false)
  const [statusHistory, setStatusHistory] = useState([])
  const [extendedMetadata, setExtendedMetadata] = useState(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [statusReason, setStatusReason] = useState('')

  // Load extended transaction details
  useEffect(() => {
    async function loadExtendedDetails() {
      try {
        setLoading(true)
        
        // Load status history
        const historyResponse = await fetch(`/api/payout-history/timeline/${payout.payout_id}`)
        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          if (historyData.success) {
            setStatusHistory(historyData.data.timeline || [])
          }
        }

        // Load extended metadata
        const metadataResponse = await fetch(`/api/payout-history/metadata/${payout.payout_id}`)
        if (metadataResponse.ok) {
          const metadataData = await metadataResponse.json()
          if (metadataData.success) {
            setExtendedMetadata(metadataData.data)
            setNotes(metadataData.data.reconciliation_notes || '')
          }
        }
        
      } catch (error) {
        console.error('Error loading extended details:', error)
      } finally {
        setLoading(false)
      }
    }

    if (payout) {
      loadExtendedDetails()
    }
  }, [payout])

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!newStatus || !statusReason) {
      alert('Please select a status and provide a reason')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/payout-history/status-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payout_record_id: payout.payout_id,
          new_status: newStatus,
          status_reason: statusReason,
          metadata: {
            manual_update: true,
            updated_by_interface: true
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setNewStatus('')
          setStatusReason('')
          onStatusUpdate() // Refresh parent data
          
          // Reload status history
          const historyResponse = await fetch(`/api/payout-history/timeline/${payout.payout_id}`)
          if (historyResponse.ok) {
            const historyData = await historyResponse.json()
            if (historyData.success) {
              setStatusHistory(historyData.data.timeline || [])
            }
          }
        } else {
          throw new Error(result.error)
        }
      } else {
        throw new Error('Failed to update status')
      }
      
    } catch (error) {
      console.error('Error updating status:', error)
      alert(`Error updating status: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle notes update
  const handleNotesUpdate = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/payout-history/metadata/${payout.payout_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reconciliation_notes: notes
        })
      })

      if (response.ok) {
        setEditingNotes(false)
      } else {
        throw new Error('Failed to update notes')
      }
      
    } catch (error) {
      console.error('Error updating notes:', error)
      alert(`Error updating notes: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Get status icon and color
  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      processing: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
      completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
      failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
      cancelled: { icon: X, color: 'text-gray-600', bg: 'bg-gray-50' },
      reversed: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' }
    }
    return configs[status] || configs.pending
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  // Calculate total commission
  const totalCommission = (payout.service_commission || 0) + (payout.product_commission || 0) + (payout.tier_bonus || 0)

  return (
    <Dialog open={!!payout} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span>Payout Details</span>
              <PayoutStatusIndicator 
                status={payout.status}
                lastUpdate={payout.latest_status_update}
                updateCount={payout.status_count}
                showLastUpdate={false}
              />
            </div>
            <div className="text-sm font-normal text-muted-foreground">
              ID: {payout.payout_id?.slice(-8)}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
            {canEdit && <TabsTrigger value="admin">Admin</TabsTrigger>}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Payout Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Barber:</span>
                    <span className="font-medium">{payout.barber_name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-lg">{formatCurrency(payout.amount)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method:</span>
                    <Badge variant="outline">
                      {payout.payout_method?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  {payout.reference_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference:</span>
                      <span className="font-mono text-sm">{payout.reference_number}</span>
                    </div>
                  )}

                  {payout.stripe_transfer_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stripe Transfer:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm">{payout.stripe_transfer_id.slice(-8)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://dashboard.stripe.com/transfers/${payout.stripe_transfer_id}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Commission Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="w-5 h-5" />
                    <span>Commission Breakdown</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {payout.service_commission > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Commission:</span>
                      <span className="font-medium">{formatCurrency(payout.service_commission)}</span>
                    </div>
                  )}
                  
                  {payout.product_commission > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Product Commission:</span>
                      <span className="font-medium">{formatCurrency(payout.product_commission)}</span>
                    </div>
                  )}
                  
                  {payout.tier_bonus > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tier Bonus:</span>
                      <span className="font-medium text-green-600">{formatCurrency(payout.tier_bonus)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Total Commission:</span>
                    <span className="font-bold">{formatCurrency(totalCommission)}</span>
                  </div>

                  {extendedMetadata?.stripe_fee_amount && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Less: Processing Fee:</span>
                        <span className="text-red-600">-{formatCurrency(extendedMetadata.stripe_fee_amount)}</span>
                      </div>
                      
                      <div className="flex justify-between font-bold border-t pt-2">
                        <span>Net Payout:</span>
                        <span>{formatCurrency(totalCommission - extendedMetadata.stripe_fee_amount)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Timing Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Timeline</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <div className="text-right">
                      <p>{format(parseISO(payout.created_at), 'MMM dd, yyyy')}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(payout.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                  
                  {payout.completed_at ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed:</span>
                      <div className="text-right">
                        <p>{format(parseISO(payout.completed_at), 'MMM dd, yyyy')}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(payout.completed_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processing Time:</span>
                      <span className="text-muted-foreground">
                        {formatDistance(parseISO(payout.created_at), new Date())}
                      </span>
                    </div>
                  )}

                  {payout.completed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Processing Time:</span>
                      <span className="font-medium">
                        {formatDistance(parseISO(payout.created_at), parseISO(payout.completed_at))}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Additional Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {payout.metadata?.notes && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Notes:</span>
                      <p className="text-sm bg-gray-50 p-2 rounded">{payout.metadata.notes}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status Updates:</span>
                    <span className="font-medium">{payout.status_count || 1}</span>
                  </div>
                  
                  {payout.latest_status_update && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Update:</span>
                      <span className="text-sm">
                        {formatDistance(parseISO(payout.latest_status_update), new Date(), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Status Update Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : statusHistory.length > 0 ? (
                  <div className="space-y-4">
                    {statusHistory.map((update, index) => {
                      const config = getStatusConfig(update.new_status)
                      const Icon = config.icon
                      
                      return (
                        <div key={update.update_id} className="flex space-x-4">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium capitalize">{update.new_status.replace('_', ' ')}</p>
                              <span className="text-sm text-muted-foreground">
                                {format(parseISO(update.occurred_at), 'MMM dd, h:mm a')}
                              </span>
                            </div>
                            
                            {update.status_reason && (
                              <p className="text-sm text-muted-foreground">{update.status_reason}</p>
                            )}
                            
                            {update.stripe_event_type && (
                              <Badge variant="outline" className="text-xs">
                                {update.stripe_event_type}
                              </Badge>
                            )}
                            
                            {update.estimated_arrival_date && (
                              <p className="text-xs text-muted-foreground">
                                Estimated arrival: {format(parseISO(update.estimated_arrival_date), 'MMM dd, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground p-8">No status history available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reconciliation Tab */}
          <TabsContent value="reconciliation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reconciliation Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {extendedMetadata ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reconciliation Status:</span>
                      <Badge variant={extendedMetadata.reconciliation_status === 'matched' ? 'default' : 'outline'}>
                        {extendedMetadata.reconciliation_status || 'Pending'}
                      </Badge>
                    </div>
                    
                    {extendedMetadata.reconciled_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reconciled:</span>
                        <span>{format(parseISO(extendedMetadata.reconciled_at), 'MMM dd, yyyy h:mm a')}</span>
                      </div>
                    )}
                    
                    {extendedMetadata.source_transactions?.length > 0 && (
                      <div>
                        <span className="text-muted-foreground block mb-2">Source Transactions:</span>
                        <div className="space-y-1">
                          {extendedMetadata.source_transactions.map((txId, index) => (
                            <Badge key={index} variant="outline" className="mr-2 mb-1 font-mono text-xs">
                              {txId.slice(-8)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">Reconciliation Notes:</span>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingNotes(!editingNotes)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      {editingNotes ? (
                        <div className="space-y-2">
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add reconciliation notes..."
                            rows={3}
                          />
                          <div className="flex space-x-2">
                            <Button size="sm" onClick={handleNotesUpdate} disabled={loading}>
                              <Save className="w-4 h-4 mr-2" />
                              Save
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEditingNotes(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm bg-gray-50 p-3 rounded">
                          {extendedMetadata.reconciliation_notes || 'No notes available'}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-4" />
                    <p>Loading reconciliation data...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Tab */}
          {canEdit && (
            <TabsContent value="admin" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">Update Status</label>
                      <div className="grid grid-cols-2 gap-4">
                        <Select value={newStatus} onValueChange={setNewStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select new status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <div className="col-span-2">
                          <Textarea
                            placeholder="Reason for status change..."
                            value={statusReason}
                            onChange={(e) => setStatusReason(e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            className="mt-2" 
                            disabled={!newStatus || !statusReason || loading}
                          >
                            Update Status
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Status Update</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to change the payout status to "{newStatus}"? This action will be logged and may trigger notifications.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleStatusUpdate}>
                              Update Status
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}