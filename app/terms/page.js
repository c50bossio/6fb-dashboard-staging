'use client'

import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">6FB</span>
              </div>
              <span className="text-xl font-bold text-gray-900">BookedBarber</span>
            </Link>
            
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-gray-600 hover:text-blue-600 flex items-center">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> January 1, 2025<br />
              <strong>Last Updated:</strong> January 1, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 mb-4">
                By accessing or using BookedBarber ("we," "our," or "us"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Services</h2>
              <p className="text-gray-600 mb-4">
                BookedBarber provides an online platform that connects customers with barbershops and barbers for appointment booking, 
                scheduling, and business management services. Our services include:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Online appointment booking and scheduling</li>
                <li>Customer management tools for barbershops</li>
                <li>SMS and email appointment reminders</li>
                <li>Payment processing services</li>
                <li>Business analytics and reporting</li>
                <li>Marketing and promotional tools</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. SMS Messaging Services</h2>
              <p className="text-gray-600 mb-4">
                By providing your phone number and opting in to our SMS services, you agree to receive:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Appointment confirmations and reminders</li>
                <li>Booking updates and changes</li>
                <li>Promotional offers from participating barbershops</li>
                <li>Service updates and notifications</li>
              </ul>
              <p className="text-gray-600 mb-4">
                <strong>Message Frequency:</strong> Message frequency varies based on your booking activity and preferences. 
                You may receive 2-10 messages per month on average.
              </p>
              <p className="text-gray-600 mb-4">
                <strong>Message and Data Rates:</strong> Standard message and data rates may apply according to your mobile plan.
              </p>
              <p className="text-gray-600 mb-4">
                <strong>Opt-Out:</strong> You can opt out of SMS messages at any time by replying STOP to any message. 
                You will receive a confirmation of your opt-out.
              </p>
              <p className="text-gray-600 mb-4">
                <strong>Help:</strong> For help with SMS services, reply HELP to any message or contact support@bookedbarber.com.
              </p>
              <p className="text-gray-600 mb-4">
                For complete SMS terms, please see our <Link href="/sms-policy" className="text-blue-600 hover:underline">SMS Messaging Policy</Link>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. User Registration and Accounts</h2>
              <p className="text-gray-600 mb-4">
                To use certain features of our services, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Keep your password secure and confidential</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Be responsible for all activities under your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Booking and Cancellation Policy</h2>
              <p className="text-gray-600 mb-4">
                When you book an appointment through BookedBarber:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>You agree to arrive on time for your scheduled appointment</li>
                <li>Cancellations must be made at least 24 hours in advance</li>
                <li>Late cancellations or no-shows may result in fees or booking restrictions</li>
                <li>Individual barbershops may have additional policies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Payment Terms</h2>
              <p className="text-gray-600 mb-4">
                Payment processing is handled through secure third-party payment processors. By using our payment services, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Pay all fees and charges associated with your bookings</li>
                <li>Provide valid payment information</li>
                <li>Authorize us to charge your payment method</li>
                <li>Be responsible for any applicable taxes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Privacy and Data Protection</h2>
              <p className="text-gray-600 mb-4">
                Your use of our services is also governed by our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>, 
                which describes how we collect, use, and protect your personal information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
              <p className="text-gray-600 mb-4">
                All content on BookedBarber, including text, graphics, logos, and software, is the property of BookedBarber or its licensors 
                and is protected by intellectual property laws. You may not use, reproduce, or distribute any content without our written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-600 mb-4">
                BookedBarber provides the platform "as is" and "as available." We are not liable for:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Service interruptions or errors</li>
                <li>Actions of barbershops or other users</li>
                <li>Quality of services provided by barbershops</li>
                <li>Lost profits or indirect damages</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Modifications to Terms</h2>
              <p className="text-gray-600 mb-4">
                We may update these Terms of Service from time to time. We will notify you of any material changes by posting the new terms 
                on this page and updating the "Last Updated" date. Your continued use of our services after changes constitutes acceptance 
                of the modified terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg text-gray-600">
                <strong>BookedBarber Support</strong><br />
                Email: support@bookedbarber.com<br />
                Phone: 1-800-BOOKED-1<br />
                Address: 123 Barber Lane, Suite 100, San Francisco, CA 94102
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
              <p className="text-gray-600 mb-4">
                These Terms of Service are governed by the laws of the State of California, without regard to its conflict of law provisions. 
                Any disputes shall be resolved in the courts of San Francisco County, California.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              © 2025 BookedBarber. All rights reserved. | 
              <Link href="/privacy" className="ml-2 text-blue-600 hover:underline">Privacy Policy</Link> | 
              <Link href="/sms-policy" className="ml-2 text-blue-600 hover:underline">SMS Policy</Link> | 
              <Link href="/contact" className="ml-2 text-blue-600 hover:underline">Contact Us</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}