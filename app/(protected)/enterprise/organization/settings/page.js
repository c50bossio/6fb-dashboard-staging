'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGlobalDashboard } from '@/contexts/GlobalDashboardContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'
import { Save, Building2, ArrowLeft } from 'lucide-react'

export default function OrganizationSettingsPage() {
  const router = useRouter()
  const { user } = useGlobalDashboard()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organization, setOrganization] = useState({
    id: null,
    name: '',
    description: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  })

  const supabase = createClient()

  useEffect(() => {
    loadOrganizationData()
  }, [user])

  const loadOrganizationData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // First get the user's profile to find their organization_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        toast.error('Failed to load profile data')
        return
      }

      // Check if user has enterprise permissions
      if (!profile || !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
        toast.error('Insufficient permissions to access organization settings')
        router.push('/dashboard')
        return
      }

      if (!profile.organization_id) {
        // If no organization exists, we can create one
        setOrganization(prev => ({
          ...prev,
          name: '6FB Enterprise', // Default name
          email: user.email || ''
        }))
        setLoading(false)
        return
      }

      // Load organization data
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single()

      if (orgError) {
        console.error('Organization error:', orgError)
        toast.error('Failed to load organization data')
        return
      }

      if (orgData) {
        setOrganization({
          id: orgData.id,
          name: orgData.name || '6FB Enterprise',
          description: orgData.description || '',
          website: orgData.website || '',
          phone: orgData.phone || '',
          email: orgData.email || user.email || '',
          address: orgData.address || '',
          city: orgData.city || '',
          state: orgData.state || '',
          zip_code: orgData.zip_code || ''
        })
      }
    } catch (error) {
      console.error('Error loading organization:', error)
      toast.error('Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id) return

    try {
      setSaving(true)

      // Get user's profile first
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      let orgData = {
        name: organization.name,
        description: organization.description,
        website: organization.website,
        phone: organization.phone,
        email: organization.email,
        address: organization.address,
        city: organization.city,
        state: organization.state,
        zip_code: organization.zip_code,
        updated_at: new Date().toISOString()
      }

      if (organization.id) {
        // Update existing organization
        const { data, error } = await supabase
          .from('organizations')
          .update(orgData)
          .eq('id', organization.id)
          .select()
          .single()

        if (error) {
          console.error('Update error:', error)
          toast.error('Failed to update organization')
          return
        }

        toast.success('Organization updated successfully')
      } else {
        // Create new organization
        orgData.created_at = new Date().toISOString()
        
        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert(orgData)
          .select()
          .single()

        if (createError) {
          console.error('Create error:', createError)
          toast.error('Failed to create organization')
          return
        }

        // Update user's profile to link to this organization
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ organization_id: newOrg.id })
          .eq('id', user.id)

        if (profileUpdateError) {
          console.error('Profile update error:', profileUpdateError)
          toast.error('Organization created but failed to link to profile')
          return
        }

        setOrganization(prev => ({ ...prev, id: newOrg.id }))
        toast.success('Organization created successfully')
      }
    } catch (error) {
      console.error('Error saving organization:', error)
      toast.error('Failed to save organization')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field, value) => {
    setOrganization(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/enterprise/locations')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Locations
              </Button>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !organization.name.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
                <p className="text-gray-600 mt-1">
                  Manage your enterprise organization details and information
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orgName">Organization Name *</Label>
                  <Input
                    id="orgName"
                    value={organization.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter organization name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="orgEmail">Email</Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    value={organization.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="organization@example.com"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orgPhone">Phone</Label>
                  <Input
                    id="orgPhone"
                    value={organization.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="orgWebsite">Website</Label>
                  <Input
                    id="orgWebsite"
                    value={organization.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://example.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="orgDescription">Description</Label>
                <Textarea
                  id="orgDescription"
                  value={organization.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of your organization"
                  rows={3}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="orgAddress">Street Address</Label>
                <Input
                  id="orgAddress"
                  value={organization.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main Street"
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="orgCity">City</Label>
                  <Input
                    id="orgCity"
                    value={organization.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="orgState">State</Label>
                  <Input
                    id="orgState"
                    value={organization.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="State"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="orgZip">ZIP Code</Label>
                  <Input
                    id="orgZip"
                    value={organization.zip_code}
                    onChange={(e) => handleInputChange('zip_code', e.target.value)}
                    placeholder="12345"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}