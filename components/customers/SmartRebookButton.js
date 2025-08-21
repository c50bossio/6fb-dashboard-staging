'use client'

import React, { useState } from 'react'
import React, { Calendar, MessageSquare, Clock, Send, Check, AlertCircle } from 'lucide-react'
import React, { Button } from '../ui/Button'
import React, { toast } from 'sonner'

export default function SmartRebookButton({ customer, onRebook }) {
  const [isOpen, setIsOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [customMessage, setCustomMessage] = useState('')
  const [suggestedTime, setSuggestedTime] = useState(null)

  // Analyze customer patterns to generate smart suggestions
  const analyzeCustomerPatterns = () => {
    const patterns = {
      visitFrequency: customer.avg_days_between_visits || 21,
      preferredDay: customer.preferred_day || 'Saturday',
      preferredTime: customer.preferred_time || '11:00 AM',
      lastService: customer.last_service || 'Haircut',
      favoriteBarber: customer.favorite_barber || 'Any available'
    }

    // Calculate next suggested appointment
    const lastVisit = customer.last_visit ? new Date(customer.last_visit) : new Date()
    const daysSinceLastVisit = Math.floor((new Date() - lastVisit) / (1000 * 60 * 60 * 24))
    const daysOverdue = daysSinceLastVisit - patterns.visitFrequency

    return {
      patterns,
      daysSinceLastVisit,
      daysOverdue,
      suggestedDate: calculateNextDate(patterns.preferredDay, daysOverdue > 7)
    }
  }

  const calculateNextDate = (preferredDay, isUrgent) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = new Date()
    const todayDay = today.getDay()
    const targetDay = days.indexOf(preferredDay)
    
    let daysToAdd = targetDay - todayDay
    if (daysToAdd <= 0 && !isUrgent) {
      daysToAdd += 7 // Next week
    } else if (daysToAdd < 0) {
      daysToAdd = Math.min(...[1, 2, 3].map(d => (targetDay + 7 - todayDay + d) % 7).filter(d => d > 0))
    }
    
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + daysToAdd)
    return nextDate
  }

  const generateSmartTemplates = () => {
    const analysis = analyzeCustomerPatterns()
    const { patterns, daysSinceLastVisit, daysOverdue } = analysis
    const firstName = customer.name?.split(' ')[0] || 'there'

    const templates = []

    // Overdue template
    if (daysOverdue > 7) {
      templates.push({
        id: 'overdue',
        type: 'urgent',
        label: '⏰ Overdue Reminder',
        message: `Hey ${firstName}! It's been ${daysSinceLastVisit} days since your last ${patterns.lastService.toLowerCase()}. Your usual ${patterns.preferredDay} ${patterns.preferredTime} slot is available. Should I book it for you?`,
        priority: 1
      })
    }

    // Regular reminder
    templates.push({
      id: 'regular',
      type: 'standard',
      label: '📅 Regular Appointment',
      message: `Hi ${firstName}, time for your regular ${patterns.lastService.toLowerCase()}! ${patterns.preferredDay} at ${patterns.preferredTime} is open with ${patterns.favoriteBarber}. Reply YES to confirm!`,
      priority: 2
    })

    // Weekend special
    if (new Date().getDay() >= 3) { // Thursday onwards
      templates.push({
        id: 'weekend',
        type: 'promo',
        label: '🎉 Weekend Slot',
        message: `${firstName}, we have a prime weekend slot available! Saturday ${patterns.preferredTime} with ${patterns.favoriteBarber}. Book now and get 10% off your next visit!`,
        priority: 3
      })
    }

    // VIP template
    if (customer.vip_status) {
      templates.push({
        id: 'vip',
        type: 'vip',
        label: '⭐ VIP Priority',
        message: `${firstName}, as our VIP customer, we've reserved your preferred ${patterns.preferredDay} ${patterns.preferredTime} slot. Confirm with a quick reply and we'll have everything ready for you!`,
        priority: 0
      })
    }

    // Birthday/Anniversary special
    if (isNearSpecialDate(customer.birthday)) {
      templates.push({
        id: 'birthday',
        type: 'special',
        label: '🎂 Birthday Special',
        message: `${firstName}, your birthday is coming up! Book your appointment and enjoy a complimentary hot towel service. ${patterns.preferredDay} ${patterns.preferredTime} available!`,
        priority: 1
      })
    }

    return templates.sort((a, b) => a.priority - b.priority)
  }

  const isNearSpecialDate = (date) => {
    if (!date) return false
    const specialDate = new Date(date)
    const today = new Date()
    const daysDiff = Math.abs(specialDate.getDate() - today.getDate())
    return specialDate.getMonth() === today.getMonth() && daysDiff <= 7
  }

  const handleSendSMS = async () => {
    const messageToSend = customMessage || selectedTemplate?.message
    
    if (!messageToSend) {
      toast.error('Please select a template or write a custom message')
      return
    }

    setSending(true)
    try {
      // Call the SMS API endpoint
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customer.phone,
          message: messageToSend,
          customerId: customer.id,
          templateId: selectedTemplate?.id,
          appointmentSuggestion: suggestedTime
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('SMS sent successfully! 📱', {
          description: `Message delivered to ${customer.name}`
        })
        
        // Log the engagement
        await fetch('/api/customers/engagement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: customer.id,
            type: 'sms_rebook',
            templateUsed: selectedTemplate?.id,
            timestamp: new Date().toISOString()
          })
        })

        setIsOpen(false)
        if (onRebook) onRebook(customer.id)
      } else {
        throw new Error(data.error || 'Failed to send SMS')
      }
    } catch (error) {
      console.error('SMS send error:', error)
      toast.error('Failed to send SMS', {
        description: error.message
      })
    } finally {
      setSending(false)
    }
  }

  const templates = generateSmartTemplates()
  const analysis = analyzeCustomerPatterns()

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="sm"
        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
      >
        <MessageSquare className="w-4 h-4 mr-1" />
        Smart Rebook
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">Smart Rebooking</h2>
                  <p className="text-gray-600 mt-1">Send {customer.name} a personalized appointment reminder</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Customer Analysis */}
            <div className="p-6 bg-blue-50 border-b">
              <h3 className="font-semibold mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Customer Insights
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Last Visit:</span>
                  <span className="ml-2 font-medium">{analysis.daysSinceLastVisit} days ago</span>
                </div>
                <div>
                  <span className="text-gray-600">Usual Frequency:</span>
                  <span className="ml-2 font-medium">Every {analysis.patterns.visitFrequency} days</span>
                </div>
                <div>
                  <span className="text-gray-600">Preferred Day:</span>
                  <span className="ml-2 font-medium">{analysis.patterns.preferredDay}</span>
                </div>
                <div>
                  <span className="text-gray-600">Preferred Time:</span>
                  <span className="ml-2 font-medium">{analysis.patterns.preferredTime}</span>
                </div>
              </div>
              {analysis.daysOverdue > 0 && (
                <div className="mt-3 p-2 bg-orange-100 rounded-lg text-orange-800 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Customer is {analysis.daysOverdue} days overdue for their regular appointment
                </div>
              )}
            </div>

            {/* Template Selection */}
            <div className="p-6">
              <h3 className="font-semibold mb-4">Choose a Message Template</h3>
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template)
                      setCustomMessage(template.message)
                    }}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{template.label}</span>
                          {template.type === 'urgent' && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Urgent</span>
                          )}
                          {template.type === 'vip' && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">VIP</span>
                          )}
                          {template.type === 'promo' && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Promo</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{template.message}</p>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <Check className="w-5 h-5 text-blue-500 ml-3 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Message */}
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">
                  Customize Message
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type your custom message here..."
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
                <div className="mt-2 text-sm text-gray-500">
                  {customMessage.length}/160 characters (1 SMS)
                </div>
              </div>

              {/* Suggested Appointment Time */}
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Suggested Appointment
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {analysis.suggestedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      {' at '}{analysis.patterns.preferredTime}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSuggestedTime(analysis.suggestedDate)}
                  >
                    Include in SMS
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t bg-gray-50 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendSMS}
                disabled={sending || (!customMessage && !selectedTemplate)}
                className="bg-gradient-to-r from-blue-500 to-blue-600"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send SMS
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}