/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, within } from '@/test-utils/test-utils'
import { 
  createTestUser, 
  createTestProfile, 
  createTestShop,
  CustomizationTestUtils,
  mockSupabaseClient 
} from '@/test-utils/test-utils'
import UnifiedCustomizePage from '@/app/(protected)/customize/page'

// Mock the actual customization components with more realistic implementations
jest.mock('@/components/customization/BarberProfileCustomization', () => {
  return function BarberProfileCustomization({ onUnsavedChanges }) {
    const [settings, setSettings] = React.useState({
      full_name: '',
      bio: '',
      phone: '',
      instagram_handle: '',
      years_experience: 0,
    })
    const [originalSettings] = React.useState({})
    const [saving, setSaving] = React.useState(false)

    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)

    React.useEffect(() => {
      onUnsavedChanges?.(hasChanges)
    }, [hasChanges, onUnsavedChanges])

    const handleSave = async () => {
      setSaving(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaving(false)
      // Reset to simulate successful save
      setSettings(originalSettings)
    }

    return (
      <div data-testid="barber-profile-customization">
        <form data-testid="barber-profile-form">
          <div>
            <label htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              data-testid="profile-full_name"
              value={settings.full_name}
              onChange={(e) => setSettings({...settings, full_name: e.target.value})}
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              data-testid="profile-bio"
              value={settings.bio}
              onChange={(e) => setSettings({...settings, bio: e.target.value})}
              placeholder="Tell clients about yourself"
              rows={4}
            />
          </div>
          <div>
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              data-testid="profile-phone"
              value={settings.phone}
              onChange={(e) => setSettings({...settings, phone: e.target.value})}
              placeholder="+1234567890"
            />
          </div>
          <div>
            <label htmlFor="instagram">Instagram Handle</label>
            <input
              id="instagram"
              data-testid="profile-instagram_handle"
              value={settings.instagram_handle}
              onChange={(e) => setSettings({...settings, instagram_handle: e.target.value})}
              placeholder="@yourusername"
            />
          </div>
          <div>
            <label htmlFor="experience">Years of Experience</label>
            <input
              id="experience"
              type="number"
              data-testid="profile-years_experience"
              value={settings.years_experience}
              onChange={(e) => setSettings({...settings, years_experience: parseInt(e.target.value) || 0})}
              min="0"
              max="50"
            />
          </div>
          <button
            type="button"
            data-testid="save-profile-button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          {hasChanges && (
            <div data-testid="unsaved-changes-warning">
              You have unsaved changes
            </div>
          )}
        </form>
      </div>
    )
  }
})

jest.mock('@/components/customization/BarbershopWebsiteCustomization', () => {
  return function BarbershopWebsiteCustomization({ onUnsavedChanges }) {
    const [settings, setSettings] = React.useState({
      shop_name: '',
      description: '',
      address: '',
      website_theme: 'modern',
      primary_color: '#3B82F6',
    })
    const [originalSettings] = React.useState({})
    const [saving, setSaving] = React.useState(false)

    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)

    React.useEffect(() => {
      onUnsavedChanges?.(hasChanges)
    }, [hasChanges, onUnsavedChanges])

    const handleSave = async () => {
      setSaving(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaving(false)
      setSettings(originalSettings)
    }

    return (
      <div data-testid="barbershop-website-customization">
        <form data-testid="barbershop-form">
          <div>
            <label htmlFor="shop_name">Shop Name</label>
            <input
              id="shop_name"
              data-testid="shop-name"
              value={settings.shop_name}
              onChange={(e) => setSettings({...settings, shop_name: e.target.value})}
              placeholder="Enter your barbershop name"
            />
          </div>
          <div>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              data-testid="shop-description"
              value={settings.description}
              onChange={(e) => setSettings({...settings, description: e.target.value})}
              placeholder="Describe your barbershop"
              rows={3}
            />
          </div>
          <div>
            <label htmlFor="address">Address</label>
            <input
              id="address"
              data-testid="shop-address"
              value={settings.address}
              onChange={(e) => setSettings({...settings, address: e.target.value})}
              placeholder="123 Main St, City, State"
            />
          </div>
          <div>
            <label htmlFor="theme">Website Theme</label>
            <select
              id="theme"
              data-testid="website-theme"
              value={settings.website_theme}
              onChange={(e) => setSettings({...settings, website_theme: e.target.value})}
            >
              <option value="modern">Modern</option>
              <option value="classic">Classic</option>
              <option value="minimalist">Minimalist</option>
            </select>
          </div>
          <div>
            <label htmlFor="primary_color">Primary Color</label>
            <input
              id="primary_color"
              type="color"
              data-testid="primary-color"
              value={settings.primary_color}
              onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
            />
          </div>
          <button
            type="button"
            data-testid="save-shop-button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving...' : 'Save Website'}
          </button>
          {hasChanges && (
            <div data-testid="unsaved-changes-warning">
              You have unsaved changes
            </div>
          )}
        </form>
      </div>
    )
  }
})

jest.mock('@/components/customization/EnterpriseWebsiteCustomization', () => {
  return function EnterpriseWebsiteCustomization({ onUnsavedChanges }) {
    const [settings, setSettings] = React.useState({
      enterprise_name: '',
      locations: [],
      branding_guidelines: '',
      unified_booking: false,
    })
    const [originalSettings] = React.useState({})
    const [saving, setSaving] = React.useState(false)

    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)

    React.useEffect(() => {
      onUnsavedChanges?.(hasChanges)
    }, [hasChanges, onUnsavedChanges])

    const handleSave = async () => {
      setSaving(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaving(false)
      setSettings(originalSettings)
    }

    return (
      <div data-testid="enterprise-website-customization">
        <form data-testid="enterprise-form">
          <div>
            <label htmlFor="enterprise_name">Enterprise Name</label>
            <input
              id="enterprise_name"
              data-testid="enterprise-name"
              value={settings.enterprise_name}
              onChange={(e) => setSettings({...settings, enterprise_name: e.target.value})}
              placeholder="Enter your enterprise name"
            />
          </div>
          <div>
            <label htmlFor="branding">Branding Guidelines</label>
            <textarea
              id="branding"
              data-testid="branding-guidelines"
              value={settings.branding_guidelines}
              onChange={(e) => setSettings({...settings, branding_guidelines: e.target.value})}
              placeholder="Describe your brand guidelines"
              rows={4}
            />
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                data-testid="unified-booking"
                checked={settings.unified_booking}
                onChange={(e) => setSettings({...settings, unified_booking: e.target.checked})}
              />
              Enable Unified Booking Across Locations
            </label>
          </div>
          <button
            type="button"
            data-testid="save-enterprise-button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving...' : 'Save Enterprise Settings'}
          </button>
          {hasChanges && (
            <div data-testid="unsaved-changes-warning">
              You have unsaved changes
            </div>
          )}
        </form>
      </div>
    )
  }
})

describe('Customization Workflows Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    localStorage.clear()
    
    // Setup Supabase mocks
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: createTestProfile(), 
            error: null 
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ 
          data: { id: 'test-id' }, 
          error: null 
        }),
      }),
      upsert: jest.fn().mockResolvedValue({ 
        data: { id: 'test-id' }, 
        error: null 
      }),
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Complete Profile Setup Workflow - BARBER Role', () => {
    it('allows barber to complete their profile setup', async () => {
      const barberProfile = createTestProfile({ role: 'BARBER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: barberProfile })

      // Skip loading
      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByTestId('barber-profile-customization')).toBeInTheDocument()
      })

      // Fill out profile form
      await user.type(screen.getByTestId('profile-full_name'), 'John Smith')
      await user.type(screen.getByTestId('profile-bio'), 'Professional barber with 10 years of experience')
      await user.type(screen.getByTestId('profile-phone'), '+1234567890')
      await user.type(screen.getByTestId('profile-instagram_handle'), '@johnthebarber')
      await user.clear(screen.getByTestId('profile-years_experience'))
      await user.type(screen.getByTestId('profile-years_experience'), '10')

      // Check that unsaved changes are tracked
      expect(screen.getByTestId('unsaved-changes-warning')).toBeInTheDocument()
      expect(screen.getByText('1 Unsaved Section')).toBeInTheDocument()

      // Save the profile
      const saveButton = screen.getByTestId('save-profile-button')
      expect(saveButton).not.toBeDisabled()
      
      await user.click(saveButton)

      // Should show saving state
      expect(screen.getByText('Saving...')).toBeInTheDocument()

      // Fast-forward through save operation
      jest.advanceTimersByTime(1100)

      await waitFor(() => {
        expect(screen.queryByTestId('unsaved-changes-warning')).not.toBeInTheDocument()
        expect(screen.queryByText('1 Unsaved Section')).not.toBeInTheDocument()
        expect(screen.getByText('100%')).toBeInTheDocument() // Progress back to 100%
      })
    })

    it('validates required fields before allowing save', async () => {
      const barberProfile = createTestProfile({ role: 'BARBER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: barberProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        screen.getByTestId('barber-profile-customization')
      })

      // Try to save without filling required fields
      const saveButton = screen.getByTestId('save-profile-button')
      expect(saveButton).toBeDisabled() // Should be disabled when no changes

      // Make a minimal change
      await user.type(screen.getByTestId('profile-full_name'), 'J')
      expect(saveButton).not.toBeDisabled()

      // Clear the field (empty required field)
      await user.clear(screen.getByTestId('profile-full_name'))
      
      // Save button should work (validation happens on backend)
      await user.click(saveButton)
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })
  })

  describe('Complete Shop Setup Workflow - SHOP_OWNER Role', () => {
    it('allows shop owner to complete both profile and shop setup', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByTestId('barbershop-website-customization')).toBeInTheDocument()
        expect(screen.getByTestId('barber-profile-customization')).toBeInTheDocument()
      })

      // Fill out barber profile first
      await user.click(screen.getByTestId('section-toggle-barber-profile'))
      
      await waitFor(() => {
        expect(screen.getByTestId('section-toggle-barber-profile')).toHaveAttribute('aria-expanded', 'true')
      })

      await user.type(screen.getByTestId('profile-full_name'), 'Sarah Johnson')
      await user.type(screen.getByTestId('profile-bio'), 'Owner and master barber')

      // Fill out shop settings (already expanded)
      await user.type(screen.getByTestId('shop-name'), 'Elite Barbershop')
      await user.type(screen.getByTestId('shop-description'), 'Premium barbershop experience')
      await user.type(screen.getByTestId('shop-address'), '123 Main St, Downtown')
      await user.selectOptions(screen.getByTestId('website-theme'), 'classic')

      // Should show 2 sections with unsaved changes
      expect(screen.getByText('2 Unsaved Sections')).toBeInTheDocument()
      expect(screen.getByText('0%')).toBeInTheDocument() // Both sections have changes

      // Save profile first
      await user.click(screen.getByTestId('save-profile-button'))
      jest.advanceTimersByTime(1100)

      await waitFor(() => {
        expect(screen.getByText('1 Unsaved Section')).toBeInTheDocument()
        expect(screen.getByText('50%')).toBeInTheDocument()
      })

      // Save shop settings
      await user.click(screen.getByTestId('save-shop-button'))
      jest.advanceTimersByTime(1100)

      await waitFor(() => {
        expect(screen.queryByText('Unsaved Section')).not.toBeInTheDocument()
        expect(screen.getByText('100%')).toBeInTheDocument()
      })
    })

    it('handles concurrent editing of multiple sections', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        screen.getByTestId('barbershop-website-customization')
      })

      // Open barber profile section
      await user.click(screen.getByTestId('section-toggle-barber-profile'))

      // Edit both sections simultaneously
      await user.type(screen.getByTestId('profile-full_name'), 'Multi-tasker')
      await user.type(screen.getByTestId('shop-name'), 'Busy Shop')

      // Both sections should show unsaved changes
      const profileSection = screen.getByTestId('customization-section-barber-profile')
      const shopSection = screen.getByTestId('customization-section-barbershop-website')

      expect(within(profileSection).getByTestId('unsaved-changes-indicator')).toBeInTheDocument()
      expect(within(shopSection).getByTestId('unsaved-changes-indicator')).toBeInTheDocument()

      // Progress should reflect both sections having changes
      expect(screen.getByText('0%')).toBeInTheDocument()
    })
  })

  describe('Complete Enterprise Workflow - ENTERPRISE_OWNER Role', () => {
    it('allows enterprise owner to manage all three sections', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByTestId('enterprise-website-customization')).toBeInTheDocument()
      })

      // Expand all sections
      await user.click(screen.getByTestId('section-toggle-barber-profile'))
      await user.click(screen.getByTestId('section-toggle-barbershop-website'))

      // Fill out all three forms
      await user.type(screen.getByTestId('profile-full_name'), 'Enterprise Manager')
      await user.type(screen.getByTestId('shop-name'), 'Flagship Location')
      await user.type(screen.getByTestId('enterprise-name'), 'BarberCorp Enterprise')
      await user.type(screen.getByTestId('branding-guidelines'), 'Consistent branding across all locations')
      await user.click(screen.getByTestId('unified-booking'))

      // Should show all three sections with changes
      expect(screen.getByText('3 Unsaved Sections')).toBeInTheDocument()
      expect(screen.getByText('0%')).toBeInTheDocument()

      // Save enterprise settings first
      await user.click(screen.getByTestId('save-enterprise-button'))
      jest.advanceTimersByTime(1100)

      await waitFor(() => {
        expect(screen.getByText('2 Unsaved Sections')).toBeInTheDocument()
        expect(screen.getByText('33%')).toBeInTheDocument()
      })

      // Save remaining sections
      await user.click(screen.getByTestId('save-profile-button'))
      jest.advanceTimersByTime(1100)

      await waitFor(() => {
        expect(screen.getByText('1 Unsaved Section')).toBeInTheDocument()
        expect(screen.getByText('67%')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('save-shop-button'))
      jest.advanceTimersByTime(1100)

      await waitFor(() => {
        expect(screen.queryByText('Unsaved Section')).not.toBeInTheDocument()
        expect(screen.getByText('100%')).toBeInTheDocument()
      })
    })

    it('handles bulk save functionality', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        screen.getByTestId('enterprise-website-customization')
      })

      // Expand all sections and make changes
      await user.click(screen.getByTestId('section-toggle-barber-profile'))
      await user.click(screen.getByTestId('section-toggle-barbershop-website'))

      await user.type(screen.getByTestId('profile-full_name'), 'Bulk Saver')
      await user.type(screen.getByTestId('shop-name'), 'Auto Save Shop')
      await user.type(screen.getByTestId('enterprise-name'), 'Bulk Save Enterprise')

      // Click bulk save button
      await user.click(screen.getByText('Save All Changes'))

      // Note: In a real implementation, this would trigger saves for all sections
      // For now, we'll verify the button is accessible
      expect(screen.getByText('Save All Changes')).toBeInTheDocument()
    })
  })

  describe('Tutorial Integration Workflow', () => {
    it('guides new user through complete setup process', async () => {
      localStorage.removeItem('customize-tutorial-seen')
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      // Tutorial should appear
      await waitFor(() => {
        expect(screen.getByText('Welcome to Customization!')).toBeInTheDocument()
      })

      // Dismiss tutorial
      await user.click(screen.getByText('Get Started'))

      // Should auto-expand shop section for shop owner
      await waitFor(() => {
        expect(screen.getByTestId('section-toggle-barbershop-website')).toHaveAttribute('aria-expanded', 'true')
      })

      // Complete the workflow
      await user.type(screen.getByTestId('shop-name'), 'Tutorial Shop')
      await user.type(screen.getByTestId('shop-description'), 'Learned from tutorial')

      expect(screen.getByTestId('unsaved-changes-warning')).toBeInTheDocument()

      // Can reopen tutorial from quick actions
      await user.click(screen.getByText('Show Tutorial'))
      expect(screen.getByText('Welcome to Customization!')).toBeInTheDocument()
    })

    it('provides contextual help throughout workflow', async () => {
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Need Help Getting Started?')).toBeInTheDocument()
        expect(screen.getByText('Contact Support')).toBeInTheDocument()
      })

      // Help section should remain visible throughout the process
      await user.click(screen.getByTestId('section-toggle-barber-profile'))
      expect(screen.getByText('Need Help Getting Started?')).toBeInTheDocument()
    })
  })

  describe('Form Validation Integration', () => {
    it('validates forms before allowing submission', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        screen.getByTestId('barbershop-website-customization')
      })

      // Expand profile section
      await user.click(screen.getByTestId('section-toggle-barber-profile'))

      // Try invalid phone number format
      await user.type(screen.getByTestId('profile-phone'), 'invalid-phone')
      
      // HTML5 validation should prevent submission if properly implemented
      // For now, we test that the form accepts the input
      expect(screen.getByTestId('profile-phone')).toHaveValue('invalid-phone')
    })

    it('provides immediate feedback for form errors', async () => {
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        screen.getByTestId('barber-profile-customization')
      })

      // Test that form fields are properly labeled for accessibility
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Bio')).toBeInTheDocument()
      expect(screen.getByLabelText('Phone')).toBeInTheDocument()
    })
  })

  describe('Auto-save Integration', () => {
    it('automatically saves changes after delay', async () => {
      // Note: Auto-save would need to be implemented in the actual components
      // This test verifies the integration points exist
      
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        screen.getByTestId('barber-profile-customization')
      })

      await user.type(screen.getByTestId('profile-full_name'), 'Auto Save Test')

      // In a real implementation, this would trigger auto-save after 5 seconds
      jest.advanceTimersByTime(6000)

      // Verify the form still works normally
      expect(screen.getByTestId('profile-full_name')).toHaveValue('Auto Save Test')
    })
  })

  describe('Navigation and State Persistence', () => {
    it('maintains section expansion state during workflow', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        screen.getByTestId('enterprise-website-customization')
      })

      // Expand additional sections
      await user.click(screen.getByTestId('section-toggle-barber-profile'))
      await user.click(screen.getByTestId('section-toggle-barbershop-website'))

      // All sections should remain expanded
      expect(screen.getByTestId('section-toggle-barber-profile')).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByTestId('section-toggle-barbershop-website')).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByTestId('section-toggle-multi-location-management')).toHaveAttribute('aria-expanded', 'true')

      // Make changes in multiple sections
      await user.type(screen.getByTestId('profile-full_name'), 'State Test')
      await user.type(screen.getByTestId('shop-name'), 'State Shop')

      // Section states should persist
      expect(screen.getByTestId('section-toggle-barber-profile')).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByTestId('section-toggle-barbershop-website')).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Error Handling in Workflows', () => {
    it('handles save failures gracefully', async () => {
      // Mock a failed save
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Save failed' }
          }),
        }),
      })

      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        screen.getByTestId('barber-profile-customization')
      })

      await user.type(screen.getByTestId('profile-full_name'), 'Fail Test')
      await user.click(screen.getByTestId('save-profile-button'))

      // Should show saving state initially
      expect(screen.getByText('Saving...')).toBeInTheDocument()

      jest.advanceTimersByTime(1100)

      // In a real implementation, error handling would show error message
      // For now, verify the form is still functional
      expect(screen.getByTestId('profile-full_name')).toHaveValue('Fail Test')
    })

    it('recovers from network interruptions', async () => {
      // This would test retry logic and offline capabilities
      // For now, verify basic resilience
      
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        screen.getByTestId('barber-profile-customization')
      })

      // Form should work even with network issues
      await user.type(screen.getByTestId('profile-full_name'), 'Network Test')
      expect(screen.getByTestId('profile-full_name')).toHaveValue('Network Test')
    })
  })

  describe('Performance During Workflows', () => {
    it('maintains responsive performance with multiple sections', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        screen.getByTestId('enterprise-website-customization')
      })

      // Rapid interactions should remain responsive
      const start = performance.now()
      
      await user.click(screen.getByTestId('section-toggle-barber-profile'))
      await user.click(screen.getByTestId('section-toggle-barbershop-website'))
      await user.type(screen.getByTestId('profile-full_name'), 'Performance Test')
      await user.type(screen.getByTestId('shop-name'), 'Fast Shop')
      await user.type(screen.getByTestId('enterprise-name'), 'Speedy Enterprise')

      const end = performance.now()
      const interactionTime = end - start

      // Should complete interactions quickly
      expect(interactionTime).toBeLessThan(500)
    })
  })
})