'use client'

import { useState, useEffect } from 'react'
import SimpleFullCalendar from '../../components/calendar/SimpleFullCalendar'

export default function FinalTestPage() {
  const [realEvents, setRealEvents] = useState([])
  const [debugInfo, setDebugInfo] = useState('Loading...')

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log('Fetching real events from API...')
        const response = await fetch('/api/calendar/appointments')
        const data = await response.json()
        
        console.log('API Response:', data)
        console.log('Appointments found:', data.appointments?.length || 0)
        
        if (data.appointments) {
          const rruleEvents = data.appointments.filter(event => event.rrule)
          console.log('RRule events found:', rruleEvents.length)
          
          rruleEvents.forEach((event, i) => {
            console.log(`RRule Event ${i+1}:`, {
              id: event.id,
              title: event.title, 
              start: event.start,
              rrule: event.rrule
            })
          })
          
          setRealEvents(data.appointments)
          setDebugInfo(`Loaded ${data.appointments.length} events, ${rruleEvents.length} with RRule`)
        } else {
          setDebugInfo('No appointments found in API response')
        }
      } catch (error) {
        console.error('Error fetching events:', error)
        setDebugInfo('Error loading events: ' + error.message)
      }
    }
    
    fetchEvents()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🔬 Final RRule Test with Real API Data
        </h1>
        <div className="mb-6 p-4 bg-olive-50 rounded-lg">
          <h2 className="font-semibold text-olive-900">Debug Info:</h2>
          <p className="text-olive-700">{debugInfo}</p>
          <p className="text-sm text-olive-600 mt-2">
            This test uses REAL API data from the calendar system to verify RRule functionality
          </p>
        </div>
        
        {realEvents.length > 0 ? (
          <div className="bg-white rounded-lg shadow">
            <SimpleFullCalendar events={realEvents} />
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading real calendar events...</p>
          </div>
        )}
      </div>
    </div>
  )
}