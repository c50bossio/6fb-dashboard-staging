'use client'

import Link from 'next/link'
import { ArrowLeftIcon, ShieldCheckIcon, LockClosedIcon, EyeSlashIcon, ServerIcon } from '@heroicons/react/24/outline'

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">6FB</span>
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">AI Agent System</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center text-gray-600 hover:text-blue-600 font-medium transition-colors">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
              <Link href="/register" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-gradient text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Security &
            <span className="block gradient-text bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Compliance
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
            Your data security is our top priority. Learn about our comprehensive security measures 
            and compliance standards.
          </p>
        </div>
      </div>

      {/* Security Features */}
      <div className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Enterprise-Grade Security</h2>
            <p className="text-xl text-gray-600">We implement industry-leading security practices to protect your business data</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <LockClosedIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">End-to-End Encryption</h3>
              <p className="text-gray-600">All data is encrypted both in transit and at rest using AES-256 encryption standards.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">SOC 2 Compliant</h3>
              <p className="text-gray-600">Our systems undergo regular third-party security audits and maintain SOC 2 Type II compliance.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <EyeSlashIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Zero-Knowledge Architecture</h3>
              <p className="text-gray-600">We cannot access your sensitive business data, ensuring complete privacy and control.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <ServerIcon className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Secure Infrastructure</h3>
              <p className="text-gray-600">Hosted on AWS with 99.9% uptime SLA and automatic backup systems.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Details */}
      <div className="section-padding bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Comprehensive Protection</h2>
          </div>
          
          <div className="space-y-8">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Data Protection</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>All customer data is encrypted using AES-256 encryption</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Regular automated backups with point-in-time recovery</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Data residency controls and GDPR compliance</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Secure data deletion and retention policies</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Access Controls</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Multi-factor authentication (MFA) for all accounts</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Role-based access control (RBAC) system</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Session management and automatic timeouts</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Audit logging for all user activities</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Infrastructure Security</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>DDoS protection and web application firewall</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Network segregation and VPC isolation</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Regular security patches and updates</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>24/7 security monitoring and incident response</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance */}
      <div className="section-padding bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Compliance & Certifications</h2>
            <p className="text-xl text-gray-600">We meet the highest industry standards for security and privacy</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">SOC 2 Type II</h3>
              <p className="text-gray-600">Audited annually for security, availability, and confidentiality controls</p>
            </div>
            <div className="text-center bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">GDPR Compliant</h3>
              <p className="text-gray-600">Full compliance with EU data protection regulations</p>
            </div>
            <div className="text-center bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">ISO 27001</h3>
              <p className="text-gray-600">Information security management system certification</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Contact */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Security Questions?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Our security team is available to answer any questions about our security practices.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/contact" className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-8 py-4 rounded-xl text-lg font-bold hover:from-yellow-300 hover:to-orange-300 transition-all duration-300 transform hover:scale-105 shadow-2xl">
              Contact Security Team
            </Link>
            <a href="mailto:security@6fb.ai" className="text-blue-100 hover:text-white font-medium transition-colors">
              security@6fb.ai
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}