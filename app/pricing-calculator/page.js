'use client'

import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import PricingCalculator from '../../components/landing/PricingCalculator'
import { LogoHeader } from '../../components/ui/Logo'

export default function PricingCalculatorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center py-3">
              <Link href="/" className="block">
                <LogoHeader size="small" />
              </Link>
            </div>
            
            <nav className="flex items-center space-x-6">
              <Link
                href="/"
                className="flex items-center text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
              <Link
                href="/subscribe"
                className="bg-gradient-to-r from-brand-600 to-brand-500 text-white px-5 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <div className="py-8">
        <PricingCalculator />
      </div>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-4">
              Ready to stop paying marketplace fees?
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/subscribe"
                className="bg-gradient-to-r from-brand-600 to-brand-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Start Free Trial
              </Link>
              <Link
                href="/contact"
                className="text-gray-600 hover:text-gray-900 px-6 py-2 font-medium transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}