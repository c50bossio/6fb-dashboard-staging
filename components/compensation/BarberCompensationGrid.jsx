/**
 * Barber Compensation Grid
 * Manages individual barber compensation with inheritance indicators
 * Shows shop defaults vs custom overrides
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building2,
  User,
  Edit,
  RotateCcw,
  Eye,
  DollarSign,
  Percent,
  Home,
  BarChart3,
  Shuffle,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'

import BarberOverrideDialog from './BarberOverrideDialog'

export default function BarberCompensationGrid({ 
  barbers = [],
  shopDefaults,
  onUpdateBarber,
  onRemoveOverride 
}) {
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  const getModelIcon = (modelType) => {
    switch (modelType) {
      case 'commission': return <Percent className="h-4 w-4" />
      case 'booth_rent': return <Home className="h-4 w-4" />
      case 'tiered': return <BarChart3 className="h-4 w-4" />
      case 'hybrid': return <Shuffle className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  const getSourceBadge = (source) => {
    switch (source) {
      case 'shop_default':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Shop Default
          </Badge>
        )
      case 'partial_override':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            Partial Custom
          </Badge>
        )
      case 'full_override':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            Full Custom
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            Unknown
          </Badge>
        )
    }
  }

  const formatCompensationDisplay = (barber) => {
    switch (barber.model_type) {
      case 'commission':
        const shopRate = (barber.commission_rate * 100).toFixed(0)
        const barberRate = ((1 - barber.commission_rate) * 100).toFixed(0)
        return `${shopRate}%/${barberRate}% split`
      
      case 'booth_rent':
        return `$${barber.booth_rent_amount}/${barber.booth_rent_frequency}`
      
      case 'tiered':
        return 'Performance Tiers'
      
      case 'hybrid':
        const baseRent = `$${barber.hybrid_base_rent}`
        const commissionRate = (barber.hybrid_commission_rate * 100).toFixed(0)
        return `${baseRent} + ${commissionRate}%`
      
      default:
        return 'Not configured'
    }
  }

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '??'
  }

  const handleEditBarber = (barber) => {
    setSelectedBarber(barber)
    setShowOverrideDialog(true)
  }

  const handleViewDetails = (barber) => {
    setSelectedBarber(barber)
    setShowDetailsDialog(true)
  }

  const handleRevertToDefaults = async (barber) => {
    if (!confirm(`Revert ${barber.barber?.full_name || 'this barber'} to shop defaults? This will remove their custom compensation terms.`)) {
      return
    }

    try {
      await onRemoveOverride(barber.barber_id)
    } catch (error) {
      console.error('Error reverting barber to defaults:', error)
      alert('Failed to revert to defaults: ' + error.message)
    }
  }

  const handleSaveOverride = async (barberId, overrides, options) => {
    try {
      await onUpdateBarber(barberId, overrides, options)
      setShowOverrideDialog(false)
      setSelectedBarber(null)
    } catch (error) {
      throw error // Let the dialog handle the error display
    }
  }

  if (!barbers || barbers.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-16">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members found</h3>
          <p className="text-gray-600 mb-4">
            Add barbers to your shop to manage their compensation
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Showing {barbers.length} barbers. 
          {' '}
          {barbers.filter(b => b.compensation_source === 'shop_default').length} using shop defaults,
          {' '}
          {barbers.filter(b => b.compensation_source !== 'shop_default').length} have custom terms.
        </AlertDescription>
      </Alert>

      {/* Barber Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Compensation Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barber</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barbers.map((barber) => (
                <TableRow key={barber.barber_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={barber.barber?.avatar_url} />
                        <AvatarFallback>
                          {getInitials(barber.barber?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {barber.barber?.full_name || 'Unknown Barber'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {barber.barber?.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getModelIcon(barber.model_type)}
                      <span className="capitalize">
                        {barber.model_type?.replace('_', ' ')}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="font-mono text-sm">
                      {formatCompensationDisplay(barber)}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    {getSourceBadge(barber.compensation_source)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(barber)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBarber(barber)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      {barber.compensation_source !== 'shop_default' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevertToDefaults(barber)}
                          title="Revert to shop defaults"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Barber Override Dialog */}
      {selectedBarber && showOverrideDialog && (
        <BarberOverrideDialog
          open={showOverrideDialog}
          onOpenChange={setShowOverrideDialog}
          barber={selectedBarber}
          shopDefaults={shopDefaults}
          onSave={handleSaveOverride}
        />
      )}

      {/* Barber Details Dialog */}
      {selectedBarber && showDetailsDialog && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedBarber.barber?.avatar_url} />
                  <AvatarFallback>
                    {getInitials(selectedBarber.barber?.full_name)}
                  </AvatarFallback>
                </Avatar>
                {selectedBarber.barber?.full_name}'s Compensation Details
              </DialogTitle>
              <DialogDescription>
                Complete compensation breakdown and inheritance details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Status Overview */}
              <div className="flex items-center gap-4">
                {getSourceBadge(selectedBarber.compensation_source)}
                <div className="flex items-center gap-2">
                  {getModelIcon(selectedBarber.model_type)}
                  <span className="capitalize font-medium">
                    {selectedBarber.model_type?.replace('_', ' ')} Model
                  </span>
                </div>
              </div>

              {/* Compensation Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedBarber.model_type === 'commission' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Shop Commission</Label>
                        <p className="font-mono">
                          {(selectedBarber.commission_rate * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <Label>Barber Earnings</Label>
                        <p className="font-mono">
                          {((1 - selectedBarber.commission_rate) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedBarber.model_type === 'booth_rent' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Rent Amount</Label>
                        <p className="font-mono">
                          ${selectedBarber.booth_rent_amount}
                        </p>
                      </div>
                      <div>
                        <Label>Frequency</Label>
                        <p className="capitalize">
                          {selectedBarber.booth_rent_frequency}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedBarber.model_type === 'hybrid' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Base Rent</Label>
                        <p className="font-mono">
                          ${selectedBarber.hybrid_base_rent}
                        </p>
                      </div>
                      <div>
                        <Label>Commission Rate</Label>
                        <p className="font-mono">
                          {(selectedBarber.hybrid_commission_rate * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <Label>Threshold</Label>
                        <p className="font-mono">
                          ${selectedBarber.hybrid_threshold}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Product Commission</Label>
                    <p className="font-mono">
                      {(selectedBarber.product_commission_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Override Details */}
              {selectedBarber.compensation_source !== 'shop_default' && selectedBarber.override_reason && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Override Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label>Reason</Label>
                      <p>{selectedBarber.override_reason}</p>
                    </div>
                    {selectedBarber.approved_by && (
                      <div>
                        <Label>Approved By</Label>
                        <p>{selectedBarber.approved_by}</p>
                      </div>
                    )}
                    {selectedBarber.effective_end_date && (
                      <div>
                        <Label>Expires</Label>
                        <p>{new Date(selectedBarber.effective_end_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Helper Label component
function Label({ children, htmlFor }) {
  return (
    <label 
      htmlFor={htmlFor} 
      className="text-sm font-medium text-gray-700"
    >
      {children}
    </label>
  )
}