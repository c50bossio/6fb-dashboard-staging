'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { 
  UserIcon, 
  BuildingStorefrontIcon, 
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

// Import existing customization components
import BarberProfileCustomization from '@/components/customization/BarberProfileCustomization'
import BarbershopWebsiteCustomization from '@/components/customization/BarbershopWebsiteCustomization'
import EnterpriseWebsiteCustomization from '@/components/customization/EnterpriseWebsiteCustomization'

const CustomizationSection = ({ 
  title, 
  description, 
  icon: Icon, 
  isExpanded, 
  onToggle, 
  children, 
  color = 'blue',
  badge
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    gold: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {badge && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          {children}
        </div>
      )}
    </div>
  )
}

export default function UnifiedCustomizePage() {
  const { user, profile } = useAuth()
  const [expandedSections, setExpandedSections] = useState(new Set(['barber']))
  
  // Determine which sections to show based on role
  const userRole = profile?.role || 'SHOP_OWNER'
  const showBarberSection = ['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)
  const showBarbershopSection = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)
  const showEnterpriseSection = ['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  useEffect(() => {
    // Auto-expand appropriate section based on role
    if (userRole === 'BARBER') {
      setExpandedSections(new Set(['barber']))
    } else if (userRole === 'SHOP_OWNER') {
      setExpandedSections(new Set(['barbershop']))
    } else if (userRole === 'ENTERPRISE_OWNER' || userRole === 'SUPER_ADMIN') {
      setExpandedSections(new Set(['enterprise']))
    }
  }, [userRole])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Customize Your Experience</h1>
          <p className="text-lg text-gray-600 mt-2">
            Personalize your profile, website, and branding to attract more customers
          </p>
        </div>

        {/* Customization Sections */}
        <div className="space-y-6">
          {/* Barber Profile Section - Shows to all roles */}
          {showBarberSection && (
            <CustomizationSection
              title="Barber Profile"
              description="Customize your individual booking profile and availability"
              icon={UserIcon}
              color="blue"
              badge={userRole === 'BARBER' ? 'Primary' : undefined}
              isExpanded={expandedSections.has('barber')}
              onToggle={() => toggleSection('barber')}
            >
              <BarberProfileCustomization />
            </CustomizationSection>
          )}

          {/* Barbershop Website Section - Shows to shop owners and enterprise */}
          {showBarbershopSection && (
            <CustomizationSection
              title="Barbershop Website"
              description="Design your shop's booking page and manage your online presence"
              icon={BuildingStorefrontIcon}
              color="purple"
              badge={userRole === 'SHOP_OWNER' ? 'Primary' : undefined}
              isExpanded={expandedSections.has('barbershop')}
              onToggle={() => toggleSection('barbershop')}
            >
              <BarbershopWebsiteCustomization />
            </CustomizationSection>
          )}

          {/* Enterprise Multi-Location Section - Shows only to enterprise */}
          {showEnterpriseSection && (
            <CustomizationSection
              title="Multi-Location Management"
              description="Manage branding and settings across multiple locations"
              icon={GlobeAltIcon}
              color="green"
              badge="Enterprise"
              isExpanded={expandedSections.has('enterprise')}
              onToggle={() => toggleSection('enterprise')}
            >
              <EnterpriseWebsiteCustomization />
            </CustomizationSection>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help Getting Started?</h3>
          <p className="text-gray-600 mb-4">
            Our customization tools help you create a professional online presence that attracts customers and grows your business.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Watch Tutorial
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}