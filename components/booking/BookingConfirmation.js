'use client'

import { CheckCircleIcon, CalendarIcon, ClockIcon, UserIcon, EnvelopeIcon } from '@heroicons/react/24/solid'

/**
 * Booking Confirmation
 * Displays success message and booking details
 */
export default function BookingConfirmation({ bookingData, staff, barbershop, onStartOver }) {
  const handleAddToCalendar = () => {
    // Generate ICS file for calendar download
    const event = {
      title: `${bookingData.serviceDetails.name} with ${staff.first_name} ${staff.last_name}`,
      start: new Date(bookingData.dateTime),
      duration: bookingData.duration,
      location: barbershop?.address || barbershop?.name || '',
      description: `Appointment with ${staff.first_name} ${staff.last_name} at ${barbershop?.name || 'our barbershop'}`,
    }

    // Create ICS content
    const icsContent = createICS(event)

    // Create download link
    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'appointment.ics'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 md:p-12 text-center">
      {/* Success Icon */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full">
          <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
      </div>

      {/* Success Message */}
      <h2 className="text-3xl font-bold text-foreground mb-2">Booking Confirmed!</h2>
      <p className="text-lg text-muted-foreground mb-8">
        Your appointment has been successfully booked
      </p>

      {/* Confirmation Number */}
      {bookingData.confirmationNumber && (
        <div className="mb-8 p-4 bg-olive-50 dark:bg-olive-900/20 border-2 border-olive-200 dark:border-olive-800 rounded-lg inline-block">
          <p className="text-sm text-olive-800 dark:text-olive-200 mb-1">Confirmation Number</p>
          <p className="text-2xl font-bold text-olive-900 dark:text-olive-100 font-mono">
            {bookingData.confirmationNumber}
          </p>
        </div>
      )}

      {/* Booking Details */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="bg-card border-2 border-border rounded-xl p-6 text-left">
          <h3 className="text-lg font-semibold text-foreground mb-4">Appointment Details</h3>

          <div className="space-y-4">
            {/* Barber */}
            <div className="flex items-start">
              <UserIcon className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Barber</p>
                <p className="font-medium text-foreground">
                  {staff.first_name} {staff.last_name}
                </p>
              </div>
            </div>

            {/* Service */}
            <div className="flex items-start">
              <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-medium text-foreground">{bookingData.serviceDetails.name}</p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start">
              <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Date & Time</p>
                <p className="font-medium text-foreground">
                  {new Date(bookingData.dateTime).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="font-medium text-foreground">
                  {new Date(bookingData.dateTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                  {' '}- Approx. {bookingData.duration} minutes
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start">
              <EnvelopeIcon className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Confirmation sent to</p>
                <p className="font-medium text-foreground">{bookingData.client_email || bookingData.customerEmail}</p>
              </div>
            </div>

            {/* Location */}
            {barbershop && (
              <div className="flex items-start pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Location</p>
                  <p className="font-medium text-foreground">{barbershop.name}</p>
                  {barbershop.address && (
                    <p className="text-sm text-muted-foreground">{barbershop.address}</p>
                  )}
                  {barbershop.phone && (
                    <a
                      href={`tel:${barbershop.phone}`}
                      className="text-sm text-olive-600 dark:text-olive-400 hover:text-olive-700 dark:hover:text-olive-300"
                    >
                      {barbershop.phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="flex justify-between items-center pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">Total Price</span>
              <span className="text-xl font-bold text-foreground">
                ${bookingData.price.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
        <button
          onClick={handleAddToCalendar}
          className="px-6 py-3 bg-olive-600 text-white rounded-lg hover:bg-olive-700 focus:ring-4 focus:ring-olive-200 flex items-center"
        >
          <CalendarIcon className="h-5 w-5 mr-2" />
          Add to Calendar
        </button>

        <button
          onClick={onStartOver}
          className="px-6 py-3 bg-card border border-border text-foreground rounded-lg hover:bg-muted"
        >
          Book Another Appointment
        </button>
      </div>

      {/* Email Notice */}
      <div className="max-w-2xl mx-auto p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          📧 A confirmation email has been sent to <strong>{bookingData.client_email || bookingData.customerEmail}</strong>
          {' '}with all the details and instructions.
        </p>
      </div>

      {/* Cancellation Policy */}
      <div className="mt-6 max-w-2xl mx-auto text-left">
        <p className="text-xs text-muted-foreground">
          <strong>Cancellation Policy:</strong> Please provide at least 24 hours notice if you need to cancel or reschedule your appointment. You can manage your booking using the link in your confirmation email.
        </p>
      </div>
    </div>
  )
}

// Helper function to create ICS file content
function createICS(event) {
  const startDate = new Date(event.start)
  const endDate = new Date(startDate.getTime() + event.duration * 60000)

  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Barbershop Booking//EN
BEGIN:VEVENT
UID:${Date.now()}@barbershop.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`
}
