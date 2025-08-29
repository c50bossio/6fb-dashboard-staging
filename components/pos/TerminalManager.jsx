'use client'

import { 
  Zap, 
  Plus, 
  Search, 
  Settings, 
  MapPin, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  Trash2, 
  RefreshCw,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export function TerminalManager({ barbershopId }) {
  const [locations, setLocations] = useState([])
  const [readers, setReaders] = useState([])
  const [loading, setLoading] = useState(false)
  const [discoveredReaders, setDiscoveredReaders] = useState([])
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [readerModalOpen, setReaderModalOpen] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [selectedLocationForReader, setSelectedLocationForReader] = useState('')
  const [readerLabel, setReaderLabel] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (barbershopId) {
      loadLocations()
      loadReaders()
    }
  }, [barbershopId])

  const loadLocations = async () => {
    try {
      const response = await fetch(`/api/stripe/terminal/locations?barbershopId=${barbershopId}`)
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
      }
    } catch (error) {
      console.error('Error loading locations:', error)
      toast({
        title: "Error",
        description: "Failed to load terminal locations",
        variant: "destructive"
      })
    }
  }

  const loadReaders = async () => {
    try {
      const response = await fetch(`/api/stripe/terminal/readers?barbershopId=${barbershopId}`)
      if (response.ok) {
        const data = await response.json()
        setReaders(data.readers || [])
      }
    } catch (error) {
      console.error('Error loading readers:', error)
      toast({
        title: "Error",
        description: "Failed to load terminal readers",
        variant: "destructive"
      })
    }
  }

  const discoverReaders = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/stripe/terminal/readers?barbershopId=${barbershopId}&discover=true`)
      if (response.ok) {
        const data = await response.json()
        setDiscoveredReaders(data.readers || [])
        
        if (data.readers?.length === 0) {
          toast({
            title: "No Readers Found",
            description: "Make sure your card readers are powered on and connected to the network.",
            variant: "default"
          })
        } else {
          toast({
            title: "Readers Discovered",
            description: `Found ${data.readers.length} available reader(s)`,
            variant: "default"
          })
        }
      }
    } catch (error) {
      console.error('Error discovering readers:', error)
      toast({
        title: "Discovery Failed",
        description: "Failed to discover card readers",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const createLocation = async () => {
    if (!newLocationName.trim()) {
      toast({
        title: "Location Name Required",
        description: "Please enter a name for the location",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/stripe/terminal/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershopId,
          displayName: newLocationName.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLocations(prev => [...prev, data.location])
        setNewLocationName('')
        setLocationModalOpen(false)
        
        toast({
          title: "Location Created",
          description: `Terminal location "${newLocationName}" created successfully`,
          variant: "default"
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create location')
      }
    } catch (error) {
      console.error('Error creating location:', error)
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const registerReader = async (reader) => {
    if (!reader) return

    setLoading(true)
    try {
      const response = await fetch('/api/stripe/terminal/readers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershopId,
          stripeReaderId: reader.stripe_reader_id,
          locationId: selectedLocationForReader || null,
          label: readerLabel.trim() || reader.label
        })
      })

      if (response.ok) {
        const data = await response.json()
        setReaders(prev => [...prev, data.reader])
        setReaderModalOpen(false)
        setReaderLabel('')
        setSelectedLocationForReader('')
        
        // Update discovered readers to show as registered
        setDiscoveredReaders(prev => 
          prev.map(r => 
            r.stripe_reader_id === reader.stripe_reader_id 
              ? { ...r, registered: true }
              : r
          )
        )

        toast({
          title: "Reader Registered",
          description: `Terminal reader "${data.reader.label}" registered successfully`,
          variant: "default"
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to register reader')
      }
    } catch (error) {
      console.error('Error registering reader:', error)
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteLocation = async (locationId) => {
    if (!confirm('Are you sure you want to delete this location? Any associated readers will be disconnected.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/stripe/terminal/locations?locationId=${locationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setLocations(prev => prev.filter(l => l.id !== locationId))
        // Reload readers to reflect location changes
        loadReaders()
        
        toast({
          title: "Location Deleted",
          description: "Terminal location deleted successfully",
          variant: "default"
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete location')
      }
    } catch (error) {
      console.error('Error deleting location:', error)
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const unregisterReader = async (readerId) => {
    if (!confirm('Are you sure you want to unregister this reader? It will no longer be available for payments.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/stripe/terminal/readers?readerId=${readerId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setReaders(prev => prev.filter(r => r.id !== readerId))
        
        toast({
          title: "Reader Unregistered",
          description: "Terminal reader unregistered successfully",
          variant: "default"
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unregister reader')
      }
    } catch (error) {
      console.error('Error unregistering reader:', error)
      toast({
        title: "Unregistration Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-600" />
      case 'offline':
        return <WifiOff className="h-4 w-4 text-gray-400" />
      case 'busy':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'online':
        return 'default'
      case 'offline':
        return 'secondary'
      case 'busy':
        return 'destructive'
      default:
        return 'destructive'
    }
  }

  return (
    <div className="space-y-6">
      {/* Locations Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Terminal Locations
            </CardTitle>
            <Dialog open={locationModalOpen} onOpenChange={setLocationModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Terminal Location</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location-name">Location Name</Label>
                    <Input
                      id="location-name"
                      placeholder="e.g., Main Counter, Station 1"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setLocationModalOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createLocation}
                      disabled={loading || !newLocationName.trim()}
                      className="flex-1"
                    >
                      Create Location
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-8 w-8 mx-auto mb-2" />
              <p>No terminal locations configured</p>
              <p className="text-sm">Create a location to organize your card readers</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {locations.map((location) => (
                <Card key={location.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{location.display_name}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {location.terminal_readers?.length || 0} reader(s)
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLocation(location.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Readers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Terminal Readers
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={discoverReaders}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Discover Readers
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Registered Readers */}
          {readers.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Registered Readers</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {readers.map((reader) => (
                  <Card key={reader.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium">{reader.label}</h5>
                            <p className="text-sm text-gray-500">{reader.device_type}</p>
                            <p className="text-xs text-gray-400">{reader.serial_number}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unregisterReader(reader.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(reader.status)}
                            <Badge variant={getStatusBadgeVariant(reader.status)}>
                              {reader.status}
                            </Badge>
                          </div>
                          
                          {reader.terminal_locations && (
                            <div className="text-xs text-gray-500">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {reader.terminal_locations.display_name}
                            </div>
                          )}
                        </div>

                        {reader.last_seen_at && (
                          <div className="text-xs text-gray-400">
                            Last seen: {new Date(reader.last_seen_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Discovered Readers */}
          {discoveredReaders.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Available Readers</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {discoveredReaders.map((reader) => (
                  <Card key={reader.stripe_reader_id} className="border-2 border-dashed">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium">
                            {reader.label || `${reader.device_type} Reader`}
                          </h5>
                          <p className="text-sm text-gray-500">{reader.device_type}</p>
                          <p className="text-xs text-gray-400">{reader.serial_number}</p>
                        </div>
                        
                        {reader.registered ? (
                          <Badge variant="default" className="w-full justify-center">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Registered
                          </Badge>
                        ) : (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" className="w-full">
                                <Plus className="h-4 w-4 mr-2" />
                                Register Reader
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Register Terminal Reader</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="reader-label">Reader Label</Label>
                                  <Input
                                    id="reader-label"
                                    placeholder={reader.label || `${reader.device_type} Reader`}
                                    value={readerLabel}
                                    onChange={(e) => setReaderLabel(e.target.value)}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="reader-location">Location (Optional)</Label>
                                  <select
                                    id="reader-location"
                                    value={selectedLocationForReader}
                                    onChange={(e) => setSelectedLocationForReader(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md"
                                  >
                                    <option value="">Select location</option>
                                    {locations.map((location) => (
                                      <option key={location.id} value={location.id}>
                                        {location.display_name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button variant="outline" className="flex-1">
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => registerReader(reader)}
                                    disabled={loading}
                                    className="flex-1"
                                  >
                                    Register
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty States */}
          {readers.length === 0 && discoveredReaders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Zap className="h-8 w-8 mx-auto mb-2" />
              <p>No terminal readers found</p>
              <p className="text-sm">Use "Discover Readers" to find available card readers</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}