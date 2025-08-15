'use client'

import { 
  RocketLaunchIcon,
  ArrowRightIcon,
  Cog6ToothIcon,
  SparklesIcon,
  PlayIcon,
  ChartBarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AIAgentsShowcase from '../components/landing/AIAgentsShowcase'
import AnalyticsPreview from '../components/landing/AnalyticsPreview'
import BarberSuccessStories from '../components/landing/BarberSuccessStories'
import BrandOwnershipSection from '../components/landing/BrandOwnershipSection'
import FeaturesSection from '../components/landing/FeaturesSection'
import PricingCalculator from '../components/landing/PricingCalculator'
import PricingSection from '../components/landing/PricingSection'
import Logo, { LogoHeader } from '../components/ui/Logo'

export default function HomePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    setIsAuthenticated(!!session)
  }

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center py-3">
                <Link href="/" className="block">
                  <LogoHeader size="medium" />
                </Link>
              </div>
              
              {/* Navigation Links */}
              <nav className="hidden md:flex items-center space-x-8">
                <Link
                  href="#features"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="#pricing"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="#how-it-works"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  How It Works
                </Link>
                <Link
                  href="#testimonials"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Testimonials
                </Link>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Contact
                </Link>
              </nav>
              
              {/* Auth Buttons */}
              <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                    <button
                      onClick={async () => {
                        const supabase = createClient()
                        await supabase.auth.signOut()
                        setIsAuthenticated(false)
                        router.refresh()
                      }}
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/subscribe"
                      className="bg-gradient-to-r from-brand-600 to-brand-500 text-white px-5 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 text-white pt-36 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-5 rounded-full"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-5 rounded-full"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-8">
                <SparklesIcon className="h-4 w-4 mr-2" />
                AI-POWERED BUSINESS PLATFORM
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold mb-8 leading-tight">
                Build Your Barbershop Empire,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
                  Not Someone Else's
                </span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-olive-100 max-w-3xl mx-auto mb-16 leading-relaxed">
                The AI-powered platform where barbers own their brand, automate their business, 
                and grow with real data. No marketplace fees. No competing for visibility. 
                100% your business.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
                <Link
                  href="/subscribe"
                  className="bg-white text-gray-900 px-8 py-4 rounded-xl text-lg font-bold hover:shadow-2xl transition-all duration-300 inline-flex items-center justify-center"
                >
                  <RocketLaunchIcon className="h-5 w-5 mr-2" />
                  Start Building Your Brand
                </Link>
                <button
                  className="bg-transparent border-2 border-white hover:bg-white hover:text-gray-900 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all duration-300 inline-flex items-center justify-center"
                >
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Watch 2-Min Demo
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 mr-2 text-green-300" />
                  <span className="font-medium">Start Free</span>
                </div>
                <div className="flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 mr-2 text-green-300" />
                  <span className="font-medium">No Credit Card Required</span>
                </div>
                <div className="flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 mr-2 text-green-300" />
                  <span className="font-medium">500+ Barbers Growing</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - What you get */}
        <section id="features">
          <FeaturesSection />
        </section>

        {/* How It Works Section */}
        <section id="how-it-works">
          <BrandOwnershipSection />
        </section>

        {/* AI Agents Showcase */}
        <AIAgentsShowcase />

        {/* Analytics Preview */}
        <AnalyticsPreview />

        {/* Pricing Section - Clear pricing tiers */}
        <section id="pricing">
          <PricingSection />
        </section>

        {/* Success Stories / Testimonials */}
        <section id="testimonials">
          <BarberSuccessStories />
        </section>

        {/* Pricing Calculator - ROI Calculator */}
        <PricingCalculator />

        {/* Final CTA Section */}
        <section className="py-24 bg-gradient-to-br from-gray-900 to-black text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-6">
              Ready to Take Control of Your Business?
            </h2>
            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              Join 500+ barbers who've stopped renting space in marketplaces 
              and started building their own empires.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-10">
              <Link
                href="/subscribe"
                className="bg-gradient-to-r from-brand-600 to-brand-500 text-white px-10 py-4 rounded-xl text-lg font-bold hover:shadow-2xl transition-all duration-300 inline-flex items-center justify-center"
              >
                Get Started Today
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </Link>
              
              <button className="bg-white text-gray-900 px-10 py-4 rounded-xl text-lg font-bold hover:shadow-2xl transition-all duration-300">
                Schedule a Demo
              </button>
            </div>
            
            <div className="text-sm text-gray-400">
              No credit card required • Cancel anytime • Full support included
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {/* Brand */}
              <div>
                <div className="mb-4">
                  <Logo size="medium" />
                </div>
                <p className="text-gray-400 text-sm">
                  The AI-powered platform where barbers own their brand and grow their business.
                </p>
                <div className="mt-4 text-sm text-gray-400">
                  <p className="font-semibold text-white mb-2">SMS Opt-In</p>
                  <p>Text START to <a href="sms:+18135483884&body=START" className="text-white font-medium hover:text-gray-300 transition-colors">813-548-3884</a> to subscribe</p>
                  <p>Text STOP to <a href="sms:+18135483884&body=STOP" className="text-white font-medium hover:text-gray-300 transition-colors">813-548-3884</a> to unsubscribe</p>
                  <p>Text HELP to <a href="sms:+18135483884&body=HELP" className="text-white font-medium hover:text-gray-300 transition-colors">813-548-3884</a> for assistance</p>
                  <p className="text-xs mt-2 text-gray-500">A2P Compliant Messaging Service</p>
                </div>
              </div>

              {/* Legal Links */}
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/sms-policy" className="text-gray-400 hover:text-white transition-colors">
                      SMS Messaging Policy
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h4 className="font-semibold mb-4">Support</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                      Contact Us
                    </Link>
                  </li>
                  <li>
                    <a href="https://support.bookedbarber.com" className="text-gray-400 hover:text-white transition-colors">
                      Help Center
                    </a>
                  </li>
                  <li>
                    <a href="mailto:support@bookedbarber.com" className="text-gray-400 hover:text-white transition-colors">
                      Email Support
                    </a>
                  </li>
                  <li className="text-gray-400">
                    SMS Issues: Text HELP to <a href="sms:+18135483884&body=HELP" className="text-white hover:text-gray-300 transition-colors">813-548-3884</a>
                  </li>
                </ul>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="font-semibold mb-4">Contact</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>
                    <span className="text-gray-500">Voice/SMS:</span> 
                    <a href="tel:+18135483884" className="text-white font-medium hover:text-gray-300 transition-colors">
                      +1 813 548 3884
                    </a>
                    <span className="text-xs ml-1">(Business Line)</span>
                  </li>
                  <li className="mt-3">support@bookedbarber.com</li>
                  <li className="mt-3">
                    BookedBarber Headquarters<br />
                    Tampa, FL
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-400 text-sm mb-4 md:mb-0">
                  © 2025 BookedBarber. All rights reserved. Message and data rates may apply.
                </p>
                <div className="flex space-x-6 text-sm">
                  <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                    Terms
                  </Link>
                  <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                    Privacy
                  </Link>
                  <Link href="/sms-policy" className="text-gray-400 hover:text-white transition-colors">
                    SMS Policy
                  </Link>
                  <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                    Contact
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
  )
}