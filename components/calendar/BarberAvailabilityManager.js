'use client'

import { Dialog, Transition } from '@headlessui/react'
import { 
  XMarkIcon, 
  ClockIcon, 
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'
import { Fragment } from 'react'

import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'

const daysOfWeek = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
]

export default function BarberAvailabilityManager({
  isOpen,
  onClose,
  barberId,
  barberName,
  barbershopId
}) {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)
  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    max_concurrent_bookings: 1,
    break_times: [],
    notes: '',
    specific_date: ''
  })

  // Fetch existing availability
  const fetchAvailability = useCallback(async () => {
    if (!barberId || !barbershopId) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('barber_availability')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .order('day_of_week')
        .order('start_time')

      if (error) throw error

      setAvailability(data || [])
    } catch (error) {
      console.error('Error fetching availability:', error)
    } finally {
      setLoading(false)
    }
  }, [barberId, barbershopId, supabase])

  useEffect(() => {
    if (isOpen) {
      fetchAvailability()
    }
  }, [isOpen, fetchAvailability])

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const availabilityData = {
        barber_id: barberId,
        barbershop_id: barbershopId,
        ...formData,
        specific_date: formData.specific_date || null,
        break_times: JSON.stringify(formData.break_times)
      }

      if (editingSlot) {
        // Update existing slot
        const { error } = await supabase
          .from('barber_availability')
          .update(availabilityData)
          .eq('id', editingSlot.id)

        if (error) throw error
      } else {
        // Create new slot
        const { error } = await supabase
          .from('barber_availability')
          .insert(availabilityData)

        if (error) throw error
      }

      // Reset form and refresh data
      setFormData({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
        max_concurrent_bookings: 1,
        break_times: [],
        notes: '',
        specific_date: ''
      })
      setEditingSlot(null)
      fetchAvailability()

    } catch (error) {
      console.error('Error saving availability:', error)
      alert('Error saving availability: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Handle delete slot
  const handleDelete = async (slotId) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) return

    try {
      const { error } = await supabase
        .from('barber_availability')
        .delete()
        .eq('id', slotId)

      if (error) throw error

      fetchAvailability()
    } catch (error) {
      console.error('Error deleting availability:', error)
      alert('Error deleting availability: ' + error.message)
    }
  }

  // Handle edit slot
  const handleEdit = (slot) => {
    setFormData({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_available: slot.is_available,
      max_concurrent_bookings: slot.max_concurrent_bookings || 1,
      break_times: typeof slot.break_times === 'string' 
        ? JSON.parse(slot.break_times || '[]') 
        : slot.break_times || [],
      notes: slot.notes || '',
      specific_date: slot.specific_date || ''
    })
    setEditingSlot(slot)
  }

  // Add break time
  const addBreakTime = () => {
    setFormData(prev => ({
      ...prev,
      break_times: [...prev.break_times, { start: '12:00', end: '13:00' }]
    }))
  }

  // Remove break time
  const removeBreakTime = (index) => {
    setFormData(prev => ({
      ...prev,
      break_times: prev.break_times.filter((_, i) => i !== index)
    }))
  }

  // Update break time
  const updateBreakTime = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      break_times: prev.break_times.map((breakTime, i) => 
        i === index ? { ...breakTime, [field]: value } : breakTime
      )
    }))
  }

  // Group availability by day
  const availabilityByDay = daysOfWeek.map(day => ({
    ...day,
    slots: availability.filter(slot => slot.day_of_week === day.value && !slot.specific_date)
  }))

  // Get specific date overrides
  const specificDateSlots = availability.filter(slot => slot.specific_date)

  return (
    <Transition.Root show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 mb-6">
                      Manage Availability - {barberName}
                    </Dialog.Title>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Current Availability */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Current Weekly Schedule</h4>
                        
                        {loading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-sm text-gray-600">Loading availability...</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {availabilityByDay.map(day => (
                              <div key={day.value} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-sm text-gray-900">{day.label}</h5>
                                  <span className="text-xs text-gray-500">
                                    {day.slots.length} slot{day.slots.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                
                                {day.slots.length === 0 ? (
                                  <p className="text-xs text-gray-500 italic">No availability set</p>
                                ) : (
                                  <div className="space-y-2">
                                    {day.slots.map(slot => (
                                      <div key={slot.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-2 text-xs">
                                            <ClockIcon className="h-3 w-3" />
                                            <span>{slot.start_time} - {slot.end_time}</span>
                                            {!slot.is_available && (
                                              <span className="text-red-600">(Unavailable)</span>
                                            )}
                                          </div>
                                          {slot.break_times && JSON.parse(slot.break_times || '[]').length > 0 && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              Breaks: {JSON.parse(slot.break_times).map(bt => `${bt.start}-${bt.end}`).join(', ')}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <button
                                            onClick={() => handleEdit(slot)}
                                            className="text-blue-600 hover:text-blue-800"
                                          >
                                            <PencilIcon className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDelete(slot.id)}
                                            className="text-red-600 hover:text-red-800"
                                          >
                                            <TrashIcon className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Specific Date Overrides */}
                        {specificDateSlots.length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-sm font-medium text-gray-900 mb-4">Date-Specific Overrides</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {specificDateSlots.map(slot => (
                                <div key={slot.id} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded p-2">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 text-xs">
                                      <CalendarIcon className="h-3 w-3" />
                                      <span>{slot.specific_date}</span>
                                      <ClockIcon className="h-3 w-3" />
                                      <span>{slot.start_time} - {slot.end_time}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => handleEdit(slot)}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      <PencilIcon className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(slot.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <TrashIcon className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Add/Edit Form */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-4">
                          {editingSlot ? 'Edit Availability' : 'Add New Availability'}
                        </h4>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                          {/* Day Selection */}
                          <div>
                            <label htmlFor="day_of_week" className="block text-sm font-medium text-gray-700">
                              Day of Week
                            </label>
                            <select
                              id="day_of_week"
                              name="day_of_week"
                              value={formData.day_of_week}
                              onChange={(e) => setFormData(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            >
                              {daysOfWeek.map(day => (
                                <option key={day.value} value={day.value}>
                                  {day.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Specific Date Override */}
                          <div>
                            <label htmlFor="specific_date" className="block text-sm font-medium text-gray-700">
                              Specific Date (Optional)
                            </label>
                            <input
                              type="date"
                              id="specific_date"
                              name="specific_date"
                              value={formData.specific_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, specific_date: e.target.value }))}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Leave empty for recurring weekly availability
                            </p>
                          </div>

                          {/* Time Range */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
                                Start Time
                              </label>
                              <input
                                type="time"
                                id="start_time"
                                name="start_time"
                                value={formData.start_time}
                                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
                                End Time
                              </label>
                              <input
                                type="time"
                                id="end_time"
                                name="end_time"
                                value={formData.end_time}
                                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                required
                              />
                            </div>
                          </div>

                          {/* Break Times */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Break Times
                              </label>
                              <button
                                type="button"
                                onClick={addBreakTime}
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                              >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                Add Break
                              </button>
                            </div>
                            
                            {formData.break_times.map((breakTime, index) => (
                              <div key={index} className="flex items-center space-x-2 mb-2">
                                <input
                                  type="time"
                                  value={breakTime.start}
                                  onChange={(e) => updateBreakTime(index, 'start', e.target.value)}
                                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                />
                                <span className="text-sm text-gray-500">to</span>
                                <input
                                  type="time"
                                  value={breakTime.end}
                                  onChange={(e) => updateBreakTime(index, 'end', e.target.value)}
                                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeBreakTime(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Options */}
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <input
                                id="is_available"
                                name="is_available"
                                type="checkbox"
                                checked={formData.is_available}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor="is_available" className="ml-2 block text-sm text-gray-900">
                                Available for bookings
                              </label>
                            </div>
                            
                            <div>
                              <label htmlFor="max_concurrent_bookings" className="block text-sm font-medium text-gray-700">
                                Max Concurrent Bookings
                              </label>
                              <input
                                type="number"
                                id="max_concurrent_bookings"
                                name="max_concurrent_bookings"
                                value={formData.max_concurrent_bookings}
                                onChange={(e) => setFormData(prev => ({ ...prev, max_concurrent_bookings: parseInt(e.target.value) }))}
                                min="1"
                                max="10"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                                Notes
                              </label>
                              <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                rows={2}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                placeholder="Optional notes..."
                              />
                            </div>
                          </div>

                          {/* Form Actions */}
                          <div className="flex justify-end space-x-3 pt-4">
                            {editingSlot && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSlot(null)
                                  setFormData({
                                    day_of_week: 1,
                                    start_time: '09:00',
                                    end_time: '17:00',
                                    is_available: true,
                                    max_concurrent_bookings: 1,
                                    break_times: [],
                                    notes: '',
                                    specific_date: ''
                                  })
                                }}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                              >
                                Cancel Edit
                              </button>
                            )}
                            <button
                              type="submit"
                              disabled={saving}
                              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {saving ? 'Saving...' : editingSlot ? 'Update' : 'Add'} Availability
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}