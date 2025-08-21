'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { 
  MapPinIcon, 
  PlusIcon, 
  BuildingOfficeIcon,
  UserGroupIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  UserIcon
} from '@heroicons/react/24/outline'

export default function EnterpriseLocationsPage() {
  const { profile } = useAuth()
  const [locations, setLocations] = useState([])
  const [summary, setSummary] = useState({})
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    status: 'active',
    organization_id: ''
  })

  useEffect(() => {
    loadLocationsData()
  }, [])

  const loadLocationsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/enterprise/locations')
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You must be an Enterprise Owner to access location management')
        }
        throw new Error('Failed to load locations data')
      }

      const result = await response.json()
      
      if (result.success) {
        setLocations(result.data.locations)
        setSummary(result.data.summary)
        setOrganizations(result.data.organizations)
      } else {
        throw new Error(result.error || 'Failed to load locations')
      }

    } catch (err) {
      console.error('Error loading locations:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLocation = async () => {
    try {
      const response = await fetch('/api/enterprise/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create_location',
          locationData: formData
        })
      })

      const result = await response.json()

      if (result.success) {
        setShowCreateDialog(false)
        setFormData({
          name: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          phone: '',
          email: '',
          status: 'active',
          organization_id: ''
        })
        await loadLocationsData() // Refresh the data
      } else {
        throw new Error(result.error || 'Failed to create location')
      }
    } catch (err) {
      console.error('Error creating location:', err)
      setError(err.message)
    }
  }

  const handleUpdateLocation = async () => {
    try {
      const response = await fetch('/api/enterprise/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update_location',
          locationData: { ...formData, id: selectedLocation.id }
        })
      })

      const result = await response.json()

      if (result.success) {
        setShowEditDialog(false)
        setSelectedLocation(null)
        await loadLocationsData()
      } else {
        throw new Error(result.error || 'Failed to update location')
      }
    } catch (err) {
      console.error('Error updating location:', err)
      setError(err.message)
    }
  }

  const handleDeactivateLocation = async (locationId) => {
    if (!confirm('Are you sure you want to deactivate this location?')) return

    try {
      const response = await fetch('/api/enterprise/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete_location',
          locationData: { id: locationId }
        })
      })

      const result = await response.json()

      if (result.success) {
        await loadLocationsData()
      } else {
        throw new Error(result.error || 'Failed to deactivate location')
      }
    } catch (err) {
      console.error('Error deactivating location:', err)
      setError(err.message)
    }
  }

  const openEditDialog = (location) => {
    setSelectedLocation(location)
    setFormData({
      name: location.name,
      address: location.address.street,
      city: location.address.city,
      state: location.address.state,
      zip: location.address.zip,
      phone: location.contact.phone,
      email: location.contact.email,
      status: location.status,
      organization_id: location.organization_id || ''
    })
    setShowEditDialog(true)
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Active', variant: 'default' },
      inactive: { label: 'Inactive', variant: 'secondary' },
      pending: { label: 'Pending', variant: 'outline' },
      maintenance: { label: 'Maintenance', variant: 'destructive' }
    }
    
    const config = statusConfig[status] || statusConfig.active
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading location data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Access Error</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadLocationsData} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Location Management</h1>
          <p className="text-gray-600 mt-2">Manage your barbershop locations and track performance</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Add New Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Location Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Downtown Barbershop"
                />
              </div>
              
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="NY"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    placeholder="10001"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="location@barbershop.com"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button onClick={handleCreateLocation} className="flex-1">
                  Create Location
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Locations</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_locations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Barbers</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_barbers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BanknotesIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${(summary.total_monthly_revenue || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_monthly_bookings || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {locations.map((location) => (
          <Card key={location.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{location.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPinIcon className="h-4 w-4" />
                    {location.address.city}, {location.address.state}
                  </CardDescription>
                </div>
                {getStatusBadge(location.status)}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <PhoneIcon className="h-4 w-4" />
                  {location.contact.phone || 'No phone'}
                </div>
                <div className="flex items-center gap-2">
                  <EnvelopeIcon className="h-4 w-4" />
                  {location.contact.email || 'No email'}
                </div>
                {location.manager && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    {location.manager.name}
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{location.metrics.barber_count}</p>
                  <p className="text-xs text-gray-600">Barbers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{location.metrics.customer_count}</p>
                  <p className="text-xs text-gray-600">Customers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">${location.metrics.monthly_revenue}</p>
                  <p className="text-xs text-gray-600">Monthly Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{location.metrics.monthly_bookings}</p>
                  <p className="text-xs text-gray-600">Bookings</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openEditDialog(location)}
                  className="flex items-center gap-1 flex-1"
                >
                  <PencilIcon className="h-3 w-3" />
                  Edit
                </Button>
                {location.status === 'active' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeactivateLocation(location.id)}
                    className="flex items-center gap-1 flex-1 text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-3 w-3" />
                    Deactivate
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      {selectedLocation && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Location Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Downtown Barbershop"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-address">Street Address</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-state">State</Label>
                  <Input
                    id="edit-state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="NY"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-zip">ZIP Code</Label>
                  <Input
                    id="edit-zip"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    placeholder="10001"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="location@barbershop.com"
                />
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button onClick={handleUpdateLocation} className="flex-1">
                  Update Location
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Empty State */}
      {locations.length === 0 && (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Locations Yet</h3>
          <p className="text-gray-600 mb-6">Start building your barbershop enterprise by adding your first location.</p>
          <Button onClick={() => setShowCreateDialog(true)} className="inline-flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Add Your First Location
          </Button>
        </div>
      )}
    </div>
  )
}