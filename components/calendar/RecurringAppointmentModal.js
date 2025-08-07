'use client'

import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CalendarIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { Fragment } from 'react'
import { RRule, RRuleSet } from 'rrule'

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'No Recurrence' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom...' }
]

const WEEKDAYS = [
  { value: RRule.SU, label: 'Sunday', short: 'Su' },
  { value: RRule.MO, label: 'Monday', short: 'Mo' },
  { value: RRule.TU, label: 'Tuesday', short: 'Tu' },
  { value: RRule.WE, label: 'Wednesday', short: 'We' },
  { value: RRule.TH, label: 'Thursday', short: 'Th' },
  { value: RRule.FR, label: 'Friday', short: 'Fr' },
  { value: RRule.SA, label: 'Saturday', short: 'Sa' }
]

export default function RecurringAppointmentModal({
  isOpen,
  onClose,
  appointmentData,
  onCreateRecurring
}) {
  const [recurrenceType, setRecurrenceType] = useState('none')
  const [customRule, setCustomRule] = useState({
    frequency: 'weekly',
    interval: 1,
    byweekday: [],
    count: 10,
    until: ''
  })
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)

  // Generate recurrence rule string
  const generateRRule = () => {
    if (recurrenceType === 'none') return null

    const startDate = new Date(appointmentData?.scheduled_at || new Date())
    
    let freq, interval = 1, byweekday = null, count = null, until = null

    switch (recurrenceType) {
      case 'daily':
        freq = RRule.DAILY
        break
      case 'weekly':
        freq = RRule.WEEKLY
        byweekday = [startDate.getDay()]
        break
      case 'biweekly':
        freq = RRule.WEEKLY
        interval = 2
        byweekday = [startDate.getDay()]
        break
      case 'monthly':
        freq = RRule.MONTHLY
        break
      case 'custom':
        freq = customRule.frequency === 'daily' ? RRule.DAILY :
              customRule.frequency === 'weekly' ? RRule.WEEKLY :
              customRule.frequency === 'monthly' ? RRule.MONTHLY : RRule.YEARLY
        interval = customRule.interval
        byweekday = customRule.byweekday.length > 0 ? customRule.byweekday : null
        count = customRule.count || null
        until = customRule.until ? new Date(customRule.until) : null
        break
      default:
        return null
    }

    // Default count if no end condition specified
    if (!count && !until) {
      count = 10
    }

    const rule = new RRule({
      freq,
      interval,
      byweekday,
      count,
      until,
      dtstart: startDate
    })

    return rule.toString()
  }

  // Generate preview of recurring dates
  const generatePreview = () => {
    const ruleString = generateRRule()
    if (!ruleString) {
      setPreview([])
      return
    }

    try {
      const rule = RRule.fromString(ruleString)
      const dates = rule.all().slice(0, 10) // Preview first 10 occurrences
      setPreview(dates)
    } catch (error) {
      console.error('Error generating preview:', error)
      setPreview([])
    }
  }

  useEffect(() => {
    generatePreview()
  }, [recurrenceType, customRule, appointmentData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (recurrenceType === 'none') {
      onClose()
      return
    }

    setLoading(true)

    try {
      const ruleString = generateRRule()
      if (!ruleString) throw new Error('Invalid recurrence rule')

      const rule = RRule.fromString(ruleString)
      const dates = rule.all()

      // Create appointments for each occurrence
      const appointments = dates.map(date => ({
        ...appointmentData,
        scheduled_at: date.toISOString(),
        recurrence_rule: ruleString,
        parent_appointment_id: null // Will be set to first appointment ID
      }))

      await onCreateRecurring(appointments)
      onClose()

    } catch (error) {
      console.error('Error creating recurring appointments:', error)
      alert('Error creating recurring appointments: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomRuleChange = (field, value) => {
    setCustomRule(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const toggleWeekday = (weekday) => {
    setCustomRule(prev => ({
      ...prev,
      byweekday: prev.byweekday.includes(weekday)
        ? prev.byweekday.filter(day => day !== weekday)
        : [...prev.byweekday, weekday]
    }))
  }

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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
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
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 mb-6 flex items-center">
                      <ArrowPathIcon className="h-5 w-5 mr-2" />
                      Create Recurring Appointment
                    </Dialog.Title>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Appointment Summary */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Appointment Details</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Customer: {appointmentData?.client_name || 'N/A'}</div>
                          <div>Service: {appointmentData?.service?.name || 'N/A'}</div>
                          <div>Duration: {appointmentData?.duration_minutes || 0} minutes</div>
                          <div>Price: ${appointmentData?.service_price || 0}</div>
                        </div>
                      </div>

                      {/* Recurrence Type */}
                      <div>
                        <label htmlFor="recurrence_type" className="block text-sm font-medium text-gray-700">
                          Repeat Schedule
                        </label>
                        <select
                          id="recurrence_type"
                          value={recurrenceType}
                          onChange={(e) => setRecurrenceType(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          {RECURRENCE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Custom Rule Options */}
                      {recurrenceType === 'custom' && (
                        <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900">Custom Recurrence</h4>
                          
                          {/* Frequency and Interval */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Repeat Every
                              </label>
                              <div className="mt-1 flex space-x-2">
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={customRule.interval}
                                  onChange={(e) => handleCustomRuleChange('interval', parseInt(e.target.value))}
                                  className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                                <select
                                  value={customRule.frequency}
                                  onChange={(e) => handleCustomRuleChange('frequency', e.target.value)}
                                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                  <option value="daily">Day(s)</option>
                                  <option value="weekly">Week(s)</option>
                                  <option value="monthly">Month(s)</option>
                                  <option value="yearly">Year(s)</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Days of week (for weekly frequency) */}
                          {customRule.frequency === 'weekly' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                On these days
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {WEEKDAYS.map(day => (
                                  <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleWeekday(day.value)}
                                    className={`px-3 py-1 text-xs rounded-full border ${
                                      customRule.byweekday.includes(day.value)
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    {day.short}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* End condition */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              End Condition
                            </label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="end_after_count"
                                  name="end_condition"
                                  checked={!!customRule.count && !customRule.until}
                                  onChange={() => handleCustomRuleChange('until', '')}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <label htmlFor="end_after_count" className="text-sm text-gray-700">
                                  After
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={customRule.count || ''}
                                  onChange={(e) => handleCustomRuleChange('count', parseInt(e.target.value) || null)}
                                  className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                />
                                <span className="text-sm text-gray-700">occurrences</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="end_on_date"
                                  name="end_condition"
                                  checked={!!customRule.until}
                                  onChange={() => handleCustomRuleChange('count', null)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <label htmlFor="end_on_date" className="text-sm text-gray-700">
                                  On
                                </label>
                                <input
                                  type="date"
                                  value={customRule.until}
                                  onChange={(e) => handleCustomRuleChange('until', e.target.value)}
                                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Preview */}
                      {recurrenceType !== 'none' && preview.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            Preview (First {Math.min(preview.length, 10)} Appointments)
                          </h4>
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {preview.slice(0, 10).map((date, index) => (
                              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm">
                                <span>#{index + 1}</span>
                                <span>{date.toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</span>
                              </div>
                            ))}
                            {preview.length > 10 && (
                              <div className="text-center text-sm text-gray-500 py-2">
                                ... and {preview.length - 10} more appointments
                              </div>
                            )}
                          </div>
                          <div className="mt-3 text-sm text-gray-600">
                            Total appointments to create: {preview.length}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading || recurrenceType === 'none' || preview.length === 0}
                          className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Creating...
                            </>
                          ) : (
                            `Create ${preview.length} Appointments`
                          )}
                        </button>
                      </div>
                    </form>
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