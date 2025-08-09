'use client'

import Navigation from '../../components/Navigation'
import { NavigationProvider } from '../../contexts/NavigationContext'

export default function TestNavigation() {
  return (
    <NavigationProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Navigation - responsive for both desktop and mobile */}
        <Navigation />
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-80 p-8">
        <h1 className="text-3xl font-bold mb-4">Navigation Test Page</h1>
        <p className="text-gray-600 mb-4">
          This page shows the navigation component without authentication requirements.
        </p>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-3">Barber Navigation Links Added:</h2>
          <ul className="space-y-2">
            <li className="text-green-600">✓ Barber Dashboard - /barber/dashboard</li>
            <li className="text-green-600">✓ My Schedule - /barber/schedule</li>
            <li className="text-green-600">✓ My Clients - /barber/clients</li>
          </ul>
          
          <h3 className="text-lg font-semibold mt-6 mb-3">Where to find them:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li><strong>Left Sidebar</strong>: Look for "BARBER OPERATIONS" section</li>
            <li><strong>Mobile Menu</strong>: Tap hamburger icon to see all navigation items</li>
            <li><strong>Quick Actions</strong>: On main dashboard, there are quick action cards</li>
          </ol>
        </div>
      </div>
    </div>
    </NavigationProvider>
  )
}