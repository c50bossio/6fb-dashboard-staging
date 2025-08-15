'use client'

import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { useState, useEffect, Fragment } from 'react'

const services = [
  { id: 'haircut', name: 'Classic Haircut', duration: 30, price: 25 },
  { id: 'beard', name: 'Beard Trim', duration: 15, price: 15 },
  { id: 'shave', name: 'Hot Shave', duration: 20, price: 20 },
  { id: 'combo', name: 'Haircut + Beard', duration: 45, price: 35 },
  { id: 'premium', name: 'Premium Package', duration: 60, price: 45 },
]

const barbers = [
  { id: 'marcus', name: 'Marcus Johnson' },
  { id: 'david', name: 'David Wilson' },
  { id: 'sophia', name: 'Sophia Martinez' },
]

export default function AppointmentModal({ 
  isOpen, 
  onClose, 
  onSave, 
  selectedSlot,
  existingAppointment = null 
}) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    service: 'haircut',
    barberId: '',
    notes: '',
    status: 'pending'
  })

  const [selectedService, setSelectedService] = useState(services[0])
  const [calculatedEndTime, setCalculatedEndTime] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (existingAppointment) {
        const appointment = existingAppointment.extendedProps
        setFormData({
          customerName: appointment.customer || '',
          customerPhone: appointment.phone || '',
          customerEmail: appointment.email || '',
          service: appointment.serviceId || 'haircut',
          barberId: existingAppointment.getResources()[0]?.id || '',
          notes: appointment.notes || '',
          status: appointment.status || 'pending'
        })
      } else if (selectedSlot) {
        setFormData(prev => ({
          ...prev,
          barberId: selectedSlot.resourceId || ''
        }))
      }
    } else {
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        service: 'haircut',
        barberId: '',
        notes: '',
        status: 'pending'
      })
    }
  }, [isOpen, existingAppointment, selectedSlot])

  useEffect(() => {
    const service = services.find(s => s.id === formData.service)
    setSelectedService(service)
    
    if (selectedSlot?.start && service) {
      const startTime = new Date(selectedSlot.start)
      const endTime = new Date(startTime.getTime() + (service.duration * 60000))
      setCalculatedEndTime(endTime.toISOString())
    }
  }, [formData.service, selectedSlot])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.customerName || !formData.customerPhone || !formData.barberId) {
      alert('Please fill in all required fields')
      return
    }

    const appointmentData = {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      service: selectedService.name,
      serviceId: selectedService.id,
      barberId: formData.barberId,
      barberName: barbers.find(b => b.id === formData.barberId)?.name,
      start: selectedSlot?.start || existingAppointment?.start,
      end: calculatedEndTime || selectedSlot?.end,
      price: selectedService.price,
      duration: selectedService.duration,
      notes: formData.notes,
      status: formData.status
    }

    onSave(appointmentData, existingAppointment?.id)
    onClose()
  }

  const formatDateTime = (dateTime) => {
    if (!dateTime) return ''
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {existingAppointment ? 'Edit Appointment' : 'New Appointment'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Appointment Time Display */}
                {selectedSlot && (
                  <div className="mb-4 p-3 bg-olive-50 border border-olive-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm text-olive-800">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {formatDateTime(selectedSlot.start)}
                        {calculatedEndTime && ` - ${formatDateTime(calculatedEndTime)}`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-olive-600 mt-1">
                      <ClockIcon className="h-4 w-4" />
                      <span>{selectedService.duration} minutes</span>
                      <CurrencyDollarIcon className="h-4 w-4 ml-2" />
                      <span>${selectedService.price}</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Customer Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                      placeholder="Enter customer name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                      placeholder="(555) 123-4567"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                      placeholder="customer@email.com"
                    />
                  </div>

                  {/* Service Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service
                    </label>
                    <select
                      name="service"
                      value={formData.service}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                    >
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} ({service.duration} min) - ${service.price}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Barber Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barber *
                    </label>
                    <select
                      name="barberId"
                      value={formData.barberId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                      required
                    >
                      <option value="">Select a barber</option>
                      {barbers.map(barber => (
                        <option key={barber.id} value={barber.id}>
                          {barber.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                      placeholder="Special requests, preferences, etc."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                    >
                      {existingAppointment ? 'Update' : 'Create'} Appointment
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}