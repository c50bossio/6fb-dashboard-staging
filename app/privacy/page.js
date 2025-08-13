'use client'

import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-olive-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">6FB</span>
              </div>
              <span className="text-xl font-bold text-gray-900">BookedBarber</span>
            </Link>
            
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-gray-600 hover:text-olive-600 flex items-center">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> January 1, 2025<br />
              <strong>Last Updated:</strong> January 1, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-600 mb-4">
                BookedBarber ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our website and services. Please read this privacy policy carefully.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Personal Information</h3>
              <p className="text-gray-600 mb-4">We collect information you provide directly to us, including:</p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Name and contact information (email address, phone number)</li>
                <li>Account credentials (username and password)</li>
                <li>Booking and appointment history</li>
                <li>Payment information (processed by secure third-party providers)</li>
                <li>Profile information (preferences, photos)</li>
                <li>Communications with us (support inquiries, feedback)</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">SMS and Phone Number Data</h3>
              <p className="text-gray-600 mb-4">
                When you opt in to receive SMS messages, we collect and store:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Your mobile phone number</li>
                <li>SMS opt-in status and preferences</li>
                <li>Message delivery confirmations</li>
                <li>SMS interaction history (replies, opt-outs)</li>
              </ul>
              <p className="text-gray-600 mb-4">
                We use Twilio as our SMS service provider. Your phone number and message data are processed in accordance with 
                <a href="https://www.twilio.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-olive-600 hover:underline ml-1">Twilio's Privacy Policy</a>.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">Automatically Collected Information</h3>
              <p className="text-gray-600 mb-4">When you use our services, we automatically collect:</p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Device information (type, operating system, browser)</li>
                <li>IP address and location data</li>
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-600 mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Provide and maintain our services</li>
                <li>Process bookings and appointments</li>
                <li>Send appointment reminders and confirmations via SMS and email</li>
                <li>Process payments and prevent fraud</li>
                <li>Communicate with you about services, updates, and promotions</li>
                <li>Improve and personalize your experience</li>
                <li>Analyze usage patterns and optimize our platform</li>
                <li>Comply with legal obligations</li>
                <li>Protect rights and safety of users and our platform</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. How We Share Your Information</h2>
              <p className="text-gray-600 mb-4">We may share your information with:</p>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Barbershops and Service Providers</h3>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Barbershops you book appointments with receive your contact information and booking details</li>
                <li>Third-party service providers who assist in operating our platform (payment processors, SMS providers, email services)</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">Legal and Safety Requirements</h3>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>When required by law, subpoena, or court order</li>
                <li>To protect rights, property, or safety of BookedBarber, users, or the public</li>
                <li>To detect, prevent, or address fraud, security, or technical issues</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">Business Transfers</h3>
              <p className="text-gray-600 mb-4">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">With Your Consent</h3>
              <p className="text-gray-600 mb-4">
                We may share your information for other purposes with your explicit consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-600 mb-4">
                We implement appropriate technical and organizational measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication measures</li>
                <li>Employee training on data protection</li>
                <li>Secure data centers and infrastructure</li>
              </ul>
              <p className="text-gray-600 mb-4">
                However, no method of transmission over the Internet is 100% secure. While we strive to protect your information, 
                we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Your Rights and Choices</h2>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Account Information</h3>
              <p className="text-gray-600 mb-4">
                You can review and update your account information by logging into your account settings.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">SMS Communications</h3>
              <p className="text-gray-600 mb-4">
                You can opt out of SMS messages at any time by:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Replying STOP to any SMS message</li>
                <li>Updating your notification preferences in account settings</li>
                <li>Contacting our support team</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">Email Communications</h3>
              <p className="text-gray-600 mb-4">
                You can unsubscribe from marketing emails using the unsubscribe link in any email. Note that you may still receive 
                transactional emails related to your bookings.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">Data Access and Deletion</h3>
              <p className="text-gray-600 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Request access to your personal information</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your account and personal data</li>
                <li>Object to processing of your information</li>
                <li>Request data portability</li>
              </ul>
              <p className="text-gray-600 mb-4">
                To exercise these rights, contact us at privacy@bookedbarber.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking Technologies</h2>
              <p className="text-gray-600 mb-4">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Remember your preferences and settings</li>
                <li>Authenticate your account</li>
                <li>Analyze platform usage and performance</li>
                <li>Provide personalized content and ads</li>
              </ul>
              <p className="text-gray-600 mb-4">
                You can manage cookie preferences through your browser settings. Note that disabling cookies may affect functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-600 mb-4">
                Our services are not directed to individuals under 13 years of age. We do not knowingly collect personal information 
                from children under 13. If we become aware that a child under 13 has provided us with personal information, we will 
                take steps to delete such information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-600 mb-4">
                Your information may be transferred to and processed in countries other than your country of residence. These countries 
                may have different data protection laws. We take appropriate measures to ensure your information is protected in accordance 
                with this privacy policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. California Privacy Rights</h2>
              <p className="text-gray-600 mb-4">
                California residents have additional rights under the California Consumer Privacy Act (CCPA), including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Right to know what personal information is collected</li>
                <li>Right to know if personal information is sold or disclosed</li>
                <li>Right to opt-out of the sale of personal information</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>
              <p className="text-gray-600 mb-4">
                We do not sell personal information to third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-gray-600 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy 
                on this page and updating the "Last Updated" date. For material changes, we may provide additional notice via email or 
                through the platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg text-gray-600">
                <strong>BookedBarber Privacy Team</strong><br />
                Email: privacy@bookedbarber.com<br />
                Phone: 1-800-BOOKED-1<br />
                Address: 123 Barber Lane, Suite 100, San Francisco, CA 94102<br />
                <br />
                <strong>Data Protection Officer:</strong><br />
                Email: dpo@bookedbarber.com
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              © 2025 BookedBarber. All rights reserved. | 
              <Link href="/terms" className="ml-2 text-olive-600 hover:underline">Terms of Service</Link> | 
              <Link href="/sms-policy" className="ml-2 text-olive-600 hover:underline">SMS Policy</Link> | 
              <Link href="/contact" className="ml-2 text-olive-600 hover:underline">Contact Us</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}