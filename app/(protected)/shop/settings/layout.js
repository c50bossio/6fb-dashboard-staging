'use client'

import SettingsSidebar from '@/components/shop/SettingsSidebar'
import SettingsBreadcrumb from '@/components/shop/SettingsBreadcrumb'

export default function SettingsLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <SettingsSidebar />
        
        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="p-6 lg:p-8">
            {/* Breadcrumb */}
            <SettingsBreadcrumb />
            
            {/* Page Content */}
            <div className="mt-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}