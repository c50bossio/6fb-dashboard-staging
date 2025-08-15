'use client'

import { ArrowLeftIcon, PhoneIcon, ChatBubbleLeftRightIcon, BellIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function SMSPolicy() {
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
          <div className="flex items-center mb-8">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-olive-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">SMS Messaging Policy</h1>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> January 1, 2025<br />
              <strong>Last Updated:</strong> January 1, 2025
            </p>

            <div className="bg-olive-50 border-l-4 border-olive-400 p-4 mb-8">
              <p className="text-olive-800">
                <strong>Quick Reference:</strong><br />
                • Text <strong>STOP</strong> to opt out at any time<br />
                • Text <strong>HELP</strong> for assistance<br />
                • Message frequency varies (2-10 msgs/month average)<br />
                • Message and data rates may apply
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <BellIcon className="h-5 w-5 mr-2 text-olive-600" />
                1. SMS Service Overview
              </h2>
              <p className="text-gray-600 mb-4">
                BookedBarber's SMS messaging service helps you stay connected with your barbershop appointments and receive important updates. 
                This policy explains how our SMS service works, what messages you'll receive, and how to manage your preferences.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. How to Opt-In</h2>
              <p className="text-gray-600 mb-4">
                You can opt in to receive SMS messages from BookedBarber in the following ways:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li><strong>Online Booking:</strong> Check the SMS opt-in box when booking an appointment at www.bookedbarber.com or any participating barbershop's booking page</li>
                <li><strong>Account Registration:</strong> Enable SMS notifications when creating your BookedBarber account</li>
                <li><strong>Text Keywords:</strong> Text START, SUBSCRIBE, or BOOK to our SMS number</li>
                <li><strong>In-Shop Sign-Up:</strong> Provide your phone number at participating barbershops</li>
              </ul>
              <p className="text-gray-600 mb-4">
                By opting in, you expressly consent to receive automated SMS messages from BookedBarber and participating barbershops.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Types of Messages You'll Receive</h2>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Appointment Messages</h3>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li><strong>Confirmations:</strong> "BookedBarber: Your appointment with [Barber Name] is confirmed for [Date] at [Time]"</li>
                <li><strong>Reminders:</strong> "BookedBarber: Reminder – you've got a haircut with [Barber] tomorrow at [Time]"</li>
                <li><strong>Rescheduling:</strong> "BookedBarber: Your appointment has been rescheduled to [New Date/Time]"</li>
                <li><strong>Cancellations:</strong> "BookedBarber: Your appointment on [Date] has been cancelled"</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">Promotional Messages (If Opted In)</h3>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li><strong>Special Offers:</strong> "BookedBarber: Limited spots this weekend! Book now for 20% off"</li>
                <li><strong>New Services:</strong> "BookedBarber: [Shop Name] now offers beard grooming services"</li>
                <li><strong>Loyalty Rewards:</strong> "BookedBarber: You've earned a free upgrade on your next visit"</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">Service Messages</h3>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li><strong>Review Requests:</strong> "BookedBarber: Thanks for visiting! Leave us a quick review"</li>
                <li><strong>Account Updates:</strong> "BookedBarber: Your account settings have been updated"</li>
                <li><strong>System Notifications:</strong> Important service updates and maintenance notices</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Message Frequency</h2>
              <p className="text-gray-600 mb-4">
                The number of messages you receive will vary based on:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>How often you book appointments</li>
                <li>Your notification preferences</li>
                <li>Promotional opt-in status</li>
              </ul>
              <p className="text-gray-600 mb-4">
                <strong>Typical frequency:</strong> Most users receive 2-10 messages per month. During busier booking periods, 
                you may receive more messages. You will never receive more than 5 messages per day.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Message and Data Rates</h2>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-yellow-800">
                  <strong>Important:</strong> Message and data rates may apply for SMS messages sent to and received from BookedBarber. 
                  These charges are determined by your mobile carrier and plan. BookedBarber does not charge for SMS messages beyond 
                  standard service fees.
                </p>
              </div>
              <p className="text-gray-600 mb-4">
                Contact your mobile carrier for details about your messaging plan and any associated costs.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <PhoneIcon className="h-5 w-5 mr-2 text-red-600" />
                6. How to Opt-Out
              </h2>
              <p className="text-gray-600 mb-4">
                You can opt out of SMS messages at any time using any of these methods:
              </p>
              <ol className="list-decimal pl-6 text-gray-600 mb-4">
                <li><strong>Text STOP:</strong> Reply STOP to any message from BookedBarber</li>
                <li><strong>Alternative Keywords:</strong> Text UNSUBSCRIBE, CANCEL, END, QUIT, STOPALL, or OPTOUT</li>
                <li><strong>Account Settings:</strong> Update your notification preferences at www.bookedbarber.com</li>
                <li><strong>Contact Support:</strong> Email support@bookedbarber.com or call 1-800-BOOKED-1</li>
              </ol>
              <p className="text-gray-600 mb-4">
                When you opt out, you'll receive a confirmation message: "You have successfully been unsubscribed. You will not receive 
                any more messages from this number. Reply START to resubscribe."
              </p>
              <p className="text-gray-600 mb-4">
                <strong>Note:</strong> Opting out of SMS messages may affect appointment reminders. We recommend updating your preferences 
                to receive email reminders instead.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. How to Get Help</h2>
              <p className="text-gray-600 mb-4">
                For assistance with our SMS service:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li><strong>Text HELP:</strong> Reply HELP to any message for immediate assistance</li>
                <li><strong>Alternative Keywords:</strong> Text INFO for help</li>
                <li><strong>Email:</strong> support@bookedbarber.com</li>
                <li><strong>Phone:</strong> 1-800-BOOKED-1 (1-800-266-5331)</li>
                <li><strong>Online:</strong> Visit www.bookedbarber.com/support</li>
              </ul>
              <p className="text-gray-600 mb-4">
                When you text HELP, you'll receive: "Reply STOP to unsubscribe. Msg&Data Rates May Apply."
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Supported Carriers</h2>
              <p className="text-gray-600 mb-4">
                Our SMS service is compatible with major U.S. mobile carriers, including but not limited to:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {['AT&T', 'Verizon', 'T-Mobile', 'Sprint', 'U.S. Cellular', 'Cricket', 
                  'Metro by T-Mobile', 'Boost Mobile', 'Virgin Mobile'].map(carrier => (
                  <div key={carrier} className="bg-gray-50 px-3 py-2 rounded text-gray-600">
                    {carrier}
                  </div>
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                Carriers are not liable for delayed or undelivered messages.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Privacy and Data Protection</h2>
              <p className="text-gray-600 mb-4">
                Your privacy is important to us. When you provide your phone number:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>We store it securely using industry-standard encryption</li>
                <li>We never sell or rent your phone number to third parties</li>
                <li>We only share it with the barbershop for your appointments</li>
                <li>We use Twilio as our SMS service provider, which complies with telecommunications regulations</li>
              </ul>
              <p className="text-gray-600 mb-4">
                For more information about how we handle your data, see our <Link href="/privacy" className="text-olive-600 hover:underline">Privacy Policy</Link>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Terms and Conditions</h2>
              <p className="text-gray-600 mb-4">
                By opting in to our SMS service, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4">
                <li>Receive automated marketing and transactional messages</li>
                <li>Provide accurate and updated phone number information</li>
                <li>Notify us if your phone number changes</li>
                <li>Be responsible for message and data charges from your carrier</li>
              </ul>
              <p className="text-gray-600 mb-4">
                Our full terms are available in our <Link href="/terms" className="text-olive-600 hover:underline">Terms of Service</Link>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Dispute Resolution</h2>
              <p className="text-gray-600 mb-4">
                If you have a dispute regarding our SMS service:
              </p>
              <ol className="list-decimal pl-6 text-gray-600 mb-4">
                <li>Contact our support team first at support@bookedbarber.com</li>
                <li>If unresolved, you may file a complaint with your state's attorney general</li>
                <li>You may also contact the Federal Communications Commission (FCC)</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Changes to This Policy</h2>
              <p className="text-gray-600 mb-4">
                We may update this SMS Policy from time to time. Changes will be posted on this page with an updated revision date. 
                Continued use of our SMS service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">BookedBarber SMS Support</h3>
                <div className="space-y-2 text-gray-600">
                  <p><strong>Text Commands:</strong> STOP (opt-out) | HELP (assistance) | START (opt-in)</p>
                  <p><strong>Email:</strong> support@bookedbarber.com</p>
                  <p><strong>Phone:</strong> 1-800-BOOKED-1 (1-800-266-5331)</p>
                  <p><strong>Mailing Address:</strong><br />
                    BookedBarber<br />
                    123 Barber Lane, Suite 100<br />
                    San Francisco, CA 94102
                  </p>
                  <p><strong>Website:</strong> www.bookedbarber.com</p>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              © 2025 BookedBarber. All rights reserved. | 
              <Link href="/terms" className="ml-2 text-olive-600 hover:underline">Terms of Service</Link> | 
              <Link href="/privacy" className="ml-2 text-olive-600 hover:underline">Privacy Policy</Link> | 
              <Link href="/contact" className="ml-2 text-olive-600 hover:underline">Contact Us</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}