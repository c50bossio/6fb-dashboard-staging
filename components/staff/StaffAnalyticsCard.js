'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, LinkIcon, UserIcon } from '@heroicons/react/24/outline'
import { ChartBarIcon, CurrencyDollarIcon, CalendarIcon } from '@heroicons/react/24/solid'
import BookingSourceBreakdown from './BookingSourceBreakdown'

/**
 * Staff Analytics Card
 * Displays performance metrics for a single staff member
 */
export default function StaffAnalyticsCard({ analytics, onViewBookingUrl }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const {
    staff_name,
    first_name,
    last_name,
    email,
    booking_slug,
    image,
    total_bookings,
    total_revenue,
    average_booking_value,
    source_breakdown,
    top_services,
    booking_url,
  } = analytics

  // Calculate staff_link conversion rate
  const staffLinkBookings = source_breakdown?.staff_link?.count || 0
  const conversionRate = total_bookings > 0 ? (staffLinkBookings / total_bookings) * 100 : 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header Section */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          {/* Staff Info */}
          <div className="flex items-center space-x-4">
            {image ? (
              <img
                src={image}
                alt={staff_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-gray-900">{staff_name}</h3>
              <p className="text-sm text-gray-600">{email}</p>
              {booking_slug && (
                <div className="mt-1 flex items-center text-sm text-olive-600">
                  <LinkIcon className="h-4 w-4 mr-1" />
                  <span className="font-mono">/book/{booking_slug}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            {booking_url && (
              <button
                onClick={() => onViewBookingUrl(booking_slug)}
                className="px-3 py-2 text-sm bg-olive-50 text-olive-700 rounded-lg hover:bg-olive-100 flex items-center"
              >
                <LinkIcon className="h-4 w-4 mr-1.5" />
                View Page
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
            >
              {isExpanded ? (
                <>
                  <ChevronUpIcon className="h-4 w-4 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDownIcon className="h-4 w-4 mr-1" />
                  Details
                </>
              )}
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Bookings */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Bookings</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{total_bookings}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  ${total_revenue.toFixed(2)}
                </p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>

          {/* Average Booking Value */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Avg. Booking</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  ${average_booking_value.toFixed(2)}
                </p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Link Performance Indicator */}
        {booking_slug && total_bookings > 0 && (
          <div className="mt-4 p-3 bg-olive-50 border border-olive-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-olive-800 font-medium">
                  Booking Link Performance
                </p>
                <p className="text-xs text-olive-600 mt-0.5">
                  {staffLinkBookings} of {total_bookings} bookings came from their personal link
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-olive-900">
                  {conversionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-olive-600">conversion rate</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Source Breakdown */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">
                Booking Sources
              </h4>
              <BookingSourceBreakdown sourceBreakdown={source_breakdown} />
            </div>

            {/* Top Services */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">
                Top Services
              </h4>
              {top_services && top_services.length > 0 ? (
                <div className="space-y-3">
                  {top_services.map((service, index) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-olive-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-olive-700">
                            #{index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {service.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            ${parseFloat(service.price).toFixed(2)} per service
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {service.booking_count} bookings
                        </p>
                        <p className="text-xs text-gray-600">
                          ${service.revenue.toFixed(2)} revenue
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 italic">No services booked yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
