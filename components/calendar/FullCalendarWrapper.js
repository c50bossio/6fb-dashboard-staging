'use client'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import resourcePlugin from '@fullcalendar/resource'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import rrulePlugin from '@fullcalendar/rrule'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useState, useCallback, useRef, useEffect } from 'react'

import { captureException } from '@/lib/sentry'

export default function FullCalendarWrapper({
  events = [],
  resources = [],
  onEventClick,
  onEventDrop,
  onEventResize,
  onDateSelect,
  onEventAdd,
  view = 'timeGridWeek',
  height = '100%',
  businessHours = {
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday - Saturday
    startTime: '09:00',
    endTime: '18:00',
  },
  slotMinTime = '08:00:00',
  slotMaxTime = '20:00:00',
  slotDuration = '00:30:00',
  showResources = false,
  showExportTools = true,
  showWaitlist = false,
  waitlistItems = [],
  onExternalEventDrop,
}) {
  const calendarRef = useRef(null)
  const [currentView, setCurrentView] = useState(view)

  // Handle external event drop (from waitlist)
  const handleExternalEventDrop = useCallback((info) => {
    try {
      const { draggedEl, date, resource } = info
      
      // Get data from the dragged element
      const eventData = {
        id: draggedEl.dataset.eventId,
        title: draggedEl.dataset.eventTitle,
        customer: draggedEl.dataset.customer,
        service: draggedEl.dataset.service,
        duration: parseInt(draggedEl.dataset.duration) || 30,
        price: parseFloat(draggedEl.dataset.price) || 0,
        phone: draggedEl.dataset.phone,
        email: draggedEl.dataset.email,
        notes: draggedEl.dataset.notes,
        priority: draggedEl.dataset.priority || 'normal'
      }

      // Calculate end time based on duration
      const startTime = date
      const endTime = new Date(startTime.getTime() + eventData.duration * 60000)
      
      // Create the new calendar event
      const newEvent = {
        ...eventData,
        start: startTime,
        end: endTime,
        resourceId: resource?.id,
        backgroundColor: draggedEl.dataset.color || '#3b82f6',
        borderColor: draggedEl.dataset.color || '#3b82f6',
        extendedProps: {
          customer: eventData.customer,
          customerPhone: eventData.phone,
          customerEmail: eventData.email,
          service: eventData.service,
          duration: eventData.duration,
          price: eventData.price,
          status: 'confirmed',
          notes: eventData.notes,
          priority: eventData.priority,
          fromWaitlist: true
        }
      }

      // Call the callback to handle the drop
      if (onExternalEventDrop) {
        onExternalEventDrop(newEvent, () => {
          // Remove the dragged element from waitlist on success
          draggedEl.remove()
        })
      } else {
        // Remove the element from waitlist
        draggedEl.remove()
      }

      alert(`✅ ${eventData.customer} scheduled successfully!`)
      
    } catch (error) {
      captureException(error, { context: 'FullCalendar.externalEventDrop' })
      alert('❌ Failed to schedule appointment from waitlist')
    }
  }, [onExternalEventDrop])

  // Initialize external draggable events
  useEffect(() => {
    if (!showWaitlist || !waitlistItems.length) return

    // Import Draggable on client-side only
    const initializeDraggable = async () => {
      try {
        const { Draggable } = await import('@fullcalendar/interaction')
        
        // Find all draggable elements
        const draggableElements = document.querySelectorAll('.fc-external-event')
        
        draggableElements.forEach(el => {
          new Draggable(el, {
            eventData: {
              title: el.dataset.eventTitle,
              duration: el.dataset.duration + ':00', // Convert minutes to HH:MM:SS
              backgroundColor: el.dataset.color,
              borderColor: el.dataset.color,
            },
            scroll: true,
            revert: true,
            revertDuration: 0
          })
        })
      } catch (error) {
        console.warn('Could not initialize draggable events:', error)
      }
    }

    // Small delay to ensure DOM is ready
    setTimeout(initializeDraggable, 100)
  }, [showWaitlist, waitlistItems])

  const handleEventClick = useCallback((info) => {
    try {
      if (onEventClick) {
        onEventClick({
          event: info.event,
          element: info.el,
          jsEvent: info.jsEvent,
          view: info.view,
        })
      }
    } catch (error) {
      captureException(error, { context: 'FullCalendar.eventClick' })
    }
  }, [onEventClick])

  const handleEventDrop = useCallback((info) => {
    try {
      const { event } = info
      const startHour = event.start.getHours()
      const endHour = event.end.getHours()
      
      // Additional validation with user feedback
      if (startHour < 9 || endHour > 18) {
        alert('❌ Cannot schedule appointments outside business hours (9 AM - 6 PM)')
        info.revert()
        return
      }
      
      if (event.start.getDay() === 0) {
        alert('❌ Barbershop is closed on Sundays')
        info.revert()
        return
      }
      
      if (startHour < 13 && endHour > 12) {
        alert('❌ Cannot schedule during lunch break (12:00 PM - 1:00 PM)')
        info.revert()
        return
      }
      
      if (onEventDrop) {
        onEventDrop({
          event: info.event,
          oldEvent: info.oldEvent,
          delta: info.delta,
          revert: info.revert,
          jsEvent: info.jsEvent,
          view: info.view,
        })
      }
    } catch (error) {
      captureException(error, { context: 'FullCalendar.eventDrop' })
      info.revert()
    }
  }, [onEventDrop])

  const handleEventResize = useCallback((info) => {
    try {
      const { event } = info
      const startHour = event.start.getHours()
      const endHour = event.end.getHours()
      const durationMinutes = (event.end - event.start) / (1000 * 60)
      
      // Validate resize constraints with user feedback
      if (startHour < 9 || endHour > 18) {
        alert('❌ Appointments must be within business hours (9 AM - 6 PM)')
        info.revert()
        return
      }
      
      if (durationMinutes < 15) {
        alert('❌ Minimum appointment duration is 15 minutes')
        info.revert()
        return
      }
      
      if (durationMinutes > 240) {
        alert('❌ Maximum appointment duration is 4 hours')
        info.revert()
        return
      }
      
      if (startHour < 13 && endHour > 12) {
        alert('❌ Appointments cannot extend into lunch break (12:00 PM - 1:00 PM)')
        info.revert()
        return
      }
      
      if (onEventResize) {
        onEventResize({
          event: info.event,
          oldEvent: info.oldEvent,
          endDelta: info.endDelta,
          revert: info.revert,
          jsEvent: info.jsEvent,
          view: info.view,
        })
      }
    } catch (error) {
      captureException(error, { context: 'FullCalendar.eventResize' })
      info.revert()
    }
  }, [onEventResize])

  const handleDateSelect = useCallback((info) => {
    try {
      if (onDateSelect) {
        onDateSelect({
          start: info.start,
          end: info.end,
          allDay: info.allDay,
          resource: info.resource,
          jsEvent: info.jsEvent,
          view: info.view,
        })
      }
      // Clear the selection
      const calendarApi = calendarRef.current?.getApi()
      if (calendarApi) {
        calendarApi.unselect()
      }
    } catch (error) {
      captureException(error, { context: 'FullCalendar.dateSelect' })
    }
  }, [onDateSelect])

  const handleEventAdd = useCallback((info) => {
    try {
      if (onEventAdd) {
        onEventAdd({
          event: info.event,
          revert: info.revert,
        })
      }
    } catch (error) {
      captureException(error, { context: 'FullCalendar.eventAdd' })
      info.revert()
    }
  }, [onEventAdd])

  const handleViewDidMount = useCallback((info) => {
    setCurrentView(info.view.type)
  }, [])

  // Export to PDF function
  const exportToPDF = useCallback(async () => {
    try {
      const calendarElement = calendarRef.current?.el
      if (!calendarElement) return

      // Create loading indicator
      const loadingDiv = document.createElement('div')
      loadingDiv.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 9999; font-family: system-ui;">
          <div style="text-align: center;">
            <div style="margin-bottom: 10px;">📄 Generating PDF...</div>
            <div style="width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top-color: #3b82f6; 
                        border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
          </div>
        </div>
        <style>
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      `
      document.body.appendChild(loadingDiv)

      // Dynamically import html2canvas and jsPDF only when needed
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ])
      
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jsPDFModule

      // Capture calendar as canvas
      const canvas = await html2canvas(calendarElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })

      // Create PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      
      // Generate filename with current date and view
      const today = new Date().toISOString().split('T')[0]
      const filename = `barbershop-schedule-${currentView}-${today}.pdf`
      
      pdf.save(filename)
      
      // Remove loading indicator
      document.body.removeChild(loadingDiv)
      
      alert('✅ Schedule exported to PDF successfully!')
      
    } catch (error) {
      captureException(error, { context: 'FullCalendarWrapper.exportToPDF' })
      alert('❌ Failed to export PDF. Please try again.')
    }
  }, [currentView])

  // Export to CSV function
  const exportToCSV = useCallback(() => {
    try {
      if (!events || events.length === 0) {
        alert('No events to export')
        return
      }

      // Prepare CSV headers
      const headers = [
        'Date',
        'Start Time',
        'End Time',
        'Customer',
        'Service',
        'Barber',
        'Duration (min)',
        'Price',
        'Status',
        'Phone',
        'Email',
        'Notes'
      ]

      // Convert events to CSV format
      const csvData = events.map(event => {
        const start = new Date(event.start)
        const end = new Date(event.end)
        const duration = Math.round((end - start) / (1000 * 60))

        return [
          start.toLocaleDateString('en-US'),
          start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          event.extendedProps?.customer || event.title.split(' - ')[0] || 'N/A',
          event.extendedProps?.service || event.title.split(' - ')[1] || event.title,
          resources.find(r => r.id === event.resourceId)?.title || 'N/A',
          duration,
          event.extendedProps?.price ? `$${event.extendedProps.price}` : 'N/A',
          event.extendedProps?.status || 'confirmed',
          event.extendedProps?.customerPhone || 'N/A',
          event.extendedProps?.customerEmail || 'N/A',
          event.extendedProps?.notes || 'N/A'
        ]
      })

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => 
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      const today = new Date().toISOString().split('T')[0]
      const filename = `barbershop-appointments-${today}.csv`
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      
      alert('✅ Appointments exported to CSV successfully!')
      
    } catch (error) {
      captureException(error, { context: 'FullCalendarWrapper.exportToCSV' })
      alert('❌ Failed to export CSV. Please try again.')
    }
  }, [events, resources])

  // Print calendar function
  const printCalendar = useCallback(() => {
    try {
      const calendarElement = calendarRef.current?.el
      if (!calendarElement) return

      // Create print-specific styles
      const printStyles = `
        @media print {
          body * { visibility: hidden; }
          .fc-wrapper, .fc-wrapper * { visibility: visible; }
          .fc-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            height: auto !important;
          }
          .fc-event {
            background-color: #f3f4f6 !important;
            color: #000 !important;
            border: 1px solid #000 !important;
          }
          .fc-toolbar {
            display: none !important;
          }
          .fc-resource-cell {
            font-weight: bold !important;
          }
        }
      `
      
      // Add print styles to document
      const styleSheet = document.createElement('style')
      styleSheet.textContent = printStyles
      document.head.appendChild(styleSheet)
      
      // Print
      window.print()
      
      // Remove print styles after printing
      setTimeout(() => {
        document.head.removeChild(styleSheet)
      }, 1000)
      
    } catch (error) {
      captureException(error, { context: 'FullCalendarWrapper.printCalendar' })
      alert('❌ Failed to print calendar. Please try again.')
    }
  }, [])

  // FullCalendar plugins configuration
  const plugins = [
    dayGridPlugin,
    timeGridPlugin,
    interactionPlugin,
    listPlugin,
    rrulePlugin,
  ]

  if (showResources) {
    plugins.push(resourcePlugin, resourceTimeGridPlugin, resourceTimelinePlugin)
  }

  return (
    <div className={`fc-wrapper ${showWaitlist ? 'flex' : ''}`} style={{ height }}>
      {/* Waitlist Sidebar */}
      {showWaitlist && (
        <div className="fc-waitlist-sidebar bg-white border-r border-gray-200 w-80 p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              📋 Waitlist ({waitlistItems.length})
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Drag appointments to schedule them on the calendar
            </p>
          </div>
          
          <div className="space-y-3">
            {waitlistItems.map((item, index) => (
              <div
                key={item.id || index}
                className="fc-external-event p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-grab hover:bg-gray-100 hover:border-blue-300 transition-all duration-200"
                data-event-id={item.id}
                data-event-title={`${item.customer} - ${item.service}`}
                data-customer={item.customer}
                data-service={item.service}
                data-duration={item.duration || 30}
                data-price={item.price || 0}
                data-phone={item.phone || ''}
                data-email={item.email || ''}
                data-notes={item.notes || ''}
                data-priority={item.priority || 'normal'}
                data-color={
                  item.priority === 'high' ? '#ef4444' :
                  item.priority === 'medium' ? '#f59e0b' : 
                  '#3b82f6'
                }
                style={{
                  borderLeftColor: 
                    item.priority === 'high' ? '#ef4444' :
                    item.priority === 'medium' ? '#f59e0b' : 
                    '#3b82f6',
                  borderLeftWidth: '4px'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">
                      {item.customer}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {item.service} • {item.duration || 30} min
                    </div>
                    {item.price && (
                      <div className="text-sm font-medium text-green-600 mt-1">
                        ${item.price}
                      </div>
                    )}
                    {item.phone && (
                      <div className="text-xs text-gray-500 mt-1">
                        📞 {item.phone}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-xs text-gray-600 mt-1 italic">
                        "{item.notes}"
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end ml-2">
                    {item.priority && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        item.priority === 'high' ? 'bg-red-100 text-red-800' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {item.priority}
                      </span>
                    )}
                    
                    <div className="text-xs text-gray-400 mt-1 flex items-center">
                      🔄 Drag to schedule
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {waitlistItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <div className="text-sm">No items in waitlist</div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Main Calendar Container */}
      <div className={`flex-1 ${showWaitlist ? 'ml-0' : ''}`}>
        {/* Export Toolbar */}
        {showExportTools && (
        <div className="fc-export-toolbar bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-700">
            📅 Current View: {currentView.charAt(0).toUpperCase() + currentView.slice(1).replace(/([A-Z])/g, ' $1')}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={printCalendar}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Print Schedule"
            >
              🖨️ Print
            </button>
            <button
              onClick={exportToPDF}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Export as PDF"
            >
              📄 PDF
            </button>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Export Appointments as CSV"
            >
              📊 CSV
            </button>
          </div>
        </div>
        )}
        
        <FullCalendar
        ref={calendarRef}
        plugins={plugins}
        initialView={view}
        schedulerLicenseKey="0875458679-fcs-1754609365"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: showResources 
            ? 'dayGridMonth,timeGridWeek,timeGridDay,resourceTimeGridDay,resourceTimelineWeek,resourceTimelineDay,listWeek'
            : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        events={events}
        resources={showResources ? resources : undefined}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        select={handleDateSelect}
        eventAdd={handleEventAdd}
        viewDidMount={handleViewDidMount}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        businessHours={businessHours}
        // External event dragging configuration
        droppable={true}
        drop={handleExternalEventDrop}
        eventReceive={(info) => {
          // Additional processing when external event is dropped
          console.log('External event received:', info.event.title)
        }}
        // Advanced event constraints
        eventConstraint="businessHours"
        selectConstraint="businessHours"
        eventOverlap={false}
        selectOverlap={false}
        // Event validation and constraints
        eventAllow={(dropInfo, draggedEvent) => {
          // Prevent dropping events on non-business hours
          const startHour = dropInfo.start.getHours()
          const endHour = dropInfo.end.getHours()
          
          // Check if within business hours (9 AM - 6 PM)
          if (startHour < 9 || endHour > 18) {
            return false
          }
          
          // Prevent scheduling on Sundays
          if (dropInfo.start.getDay() === 0) {
            return false
          }
          
          // Prevent scheduling during lunch breaks (12-1 PM)
          if (startHour < 13 && endHour > 12) {
            return false
          }
          
          return true
        }}
        selectAllow={(selectInfo) => {
          // Only allow selection on business hours
          const startHour = selectInfo.start.getHours()
          const endHour = selectInfo.end.getHours()
          
          // Check if within business hours
          if (startHour < 9 || endHour > 18) {
            return false
          }
          
          // Prevent selection on Sundays
          if (selectInfo.start.getDay() === 0) {
            return false
          }
          
          // Minimum appointment duration (15 minutes)
          const durationMinutes = (selectInfo.end - selectInfo.start) / (1000 * 60)
          if (durationMinutes < 15) {
            return false
          }
          
          // Maximum appointment duration (4 hours)
          if (durationMinutes > 240) {
            return false
          }
          
          return true
        }}
        // Event duration constraints
        eventMinWidth={50}
        eventMinHeight={20}
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
        slotDuration={slotDuration}
        height="100%"
        // Appearance
        eventDisplay="block"
        eventColor="#3b82f6"
        eventTextColor="#ffffff"
        nowIndicator={true}
        // Performance
        lazyFetching={true}
        progressiveEventRendering={true}
        // Accessibility and Popovers
        eventDidMount={(info) => {
          // Add accessibility attributes
          info.el.setAttribute('role', 'button')
          info.el.setAttribute('aria-label', `Event: ${info.event.title}`)
          
          // Add custom popover with rich appointment details
          const { event } = info
          const props = event.extendedProps
          
          // Create popover content
          const popoverContent = `
            <div class="appointment-popover bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm">
              <div class="border-b border-gray-100 pb-3 mb-3">
                <h4 class="font-bold text-gray-900 text-lg">${event.title}</h4>
                <p class="text-sm text-gray-600">
                  ${event.start.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p class="text-sm text-gray-600">
                  ${event.start.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })} - ${event.end.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
              
              ${props.customer ? `
                <div class="space-y-2 mb-3">
                  <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <span class="font-medium text-gray-900">${props.customer}</span>
                  </div>
                  
                  ${props.customerPhone ? `
                    <div class="flex items-center text-sm">
                      <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                      </svg>
                      <a href="tel:${props.customerPhone}" class="text-blue-600 hover:text-blue-800">${props.customerPhone}</a>
                    </div>
                  ` : ''}
                  
                  ${props.customerEmail ? `
                    <div class="flex items-center text-sm">
                      <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                      <a href="mailto:${props.customerEmail}" class="text-blue-600 hover:text-blue-800">${props.customerEmail}</a>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              
              <div class="space-y-2 mb-3">
                ${props.service ? `
                  <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                    </svg>
                    <span class="text-gray-900">${props.service}</span>
                  </div>
                ` : ''}
                
                ${props.duration ? `
                  <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="text-gray-900">${props.duration} minutes</span>
                  </div>
                ` : ''}
                
                ${props.price ? `
                  <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                    </svg>
                    <span class="text-gray-900 font-medium">$${props.price}</span>
                  </div>
                ` : ''}
                
                ${props.status ? `
                  <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${
                      props.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      props.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      props.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }">${props.status || 'confirmed'}</span>
                  </div>
                ` : ''}
              </div>
              
              ${props.notes ? `
                <div class="border-t border-gray-100 pt-3">
                  <p class="text-sm text-gray-600">
                    <span class="font-medium">Notes:</span> ${props.notes}
                  </p>
                </div>
              ` : ''}
              
              <div class="border-t border-gray-100 pt-3 mt-3">
                <div class="flex space-x-2">
                  <button class="flex-1 bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 transition-colors">
                    Edit
                  </button>
                  <button class="flex-1 bg-gray-100 text-gray-700 text-xs px-3 py-2 rounded hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                  <button class="bg-green-600 text-white text-xs px-3 py-2 rounded hover:bg-green-700 transition-colors">
                    ✓ Complete
                  </button>
                </div>
              </div>
            </div>
          `
          
          // Add click handler for custom popover
          let popoverElement = null
          let popoverTimeout = null
          
          const showPopover = (e) => {
            // Clear existing popover
            if (popoverElement) {
              popoverElement.remove()
            }
            
            // Create new popover
            popoverElement = document.createElement('div')
            popoverElement.innerHTML = popoverContent
            popoverElement.style.cssText = `
              position: absolute;
              z-index: 1000;
              pointer-events: auto;
            `
            
            document.body.appendChild(popoverElement)
            
            // Position popover
            const rect = info.el.getBoundingClientRect()
            const popoverRect = popoverElement.firstElementChild.getBoundingClientRect()
            
            let left = rect.left + (rect.width / 2) - (popoverRect.width / 2)
            let top = rect.top - popoverRect.height - 10
            
            // Adjust if popover goes off screen
            if (left < 10) left = 10
            if (left + popoverRect.width > window.innerWidth - 10) {
              left = window.innerWidth - popoverRect.width - 10
            }
            if (top < 10) {
              top = rect.bottom + 10
            }
            
            popoverElement.style.left = left + 'px'
            popoverElement.style.top = top + 'px'
            
            // Auto-hide after 10 seconds
            popoverTimeout = setTimeout(hidePopover, 10000)
          }
          
          const hidePopover = () => {
            if (popoverElement) {
              popoverElement.remove()
              popoverElement = null
            }
            if (popoverTimeout) {
              clearTimeout(popoverTimeout)
              popoverTimeout = null
            }
          }
          
          // Event listeners
          info.el.addEventListener('click', showPopover)
          info.el.addEventListener('mouseleave', () => {
            setTimeout(hidePopover, 2000) // Hide after 2 seconds
          })
          
          // Close popover when clicking outside
          document.addEventListener('click', (e) => {
            if (popoverElement && !popoverElement.contains(e.target) && !info.el.contains(e.target)) {
              hidePopover()
            }
          })
        }}
        // Custom event content
        eventContent={(eventInfo) => {
          const { event } = eventInfo
          return (
            <div className="fc-event-content-custom p-1">
              <div className="font-semibold text-sm truncate">{event.title}</div>
              {event.extendedProps.customer && (
                <div className="text-xs opacity-90 truncate">
                  {event.extendedProps.customer}
                </div>
              )}
              {event.extendedProps.service && (
                <div className="text-xs opacity-75 truncate">
                  {event.extendedProps.service}
                </div>
              )}
            </div>
          )
        }}
        // Responsive
        aspectRatio={1.8}
        handleWindowResize={true}
        windowResizeDelay={100}
      />
      
      <style jsx global>{`
        .fc-wrapper {
          font-family: inherit;
        }
        
        .fc-event {
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .fc-timegrid-slot {
          height: 60px;
        }
        
        .fc-col-header-cell {
          background-color: #f9fafb;
          font-weight: 600;
        }
        
        .fc-scrollgrid {
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .fc-today {
          background-color: rgba(59, 130, 246, 0.05) !important;
        }
        
        .fc-event-selected {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
        }
        
        /* Background Events Styling */
        .fc-bg-event {
          opacity: 0.7;
        }
        
        .fc-lunch-break {
          background-color: #fef3c7 !important;
          border: 1px solid #f59e0b !important;
        }
        
        .fc-holiday {
          background-color: #fecaca !important;
          border: 1px solid #ef4444 !important;
        }
        
        .fc-maintenance {
          background-color: #e0e7ff !important;
          border: 1px solid #6366f1 !important;
        }
        
        .fc-closed-day {
          background-color: #f3f4f6 !important;
          border: 1px solid #d1d5db !important;
        }
        
        .fc-bg-event:hover {
          opacity: 0.9;
          cursor: default;
        }

        /* Event constraint violation styling */
        .fc-slot[data-time="12:00:00"],
        .fc-slot[data-time="12:15:00"],
        .fc-slot[data-time="12:30:00"],
        .fc-slot[data-time="12:45:00"] {
          background-color: #fef3c7 !important;
          cursor: not-allowed !important;
        }
        
        .fc-slot[data-time="12:00:00"]:after {
          content: "🍽️ Lunch";
          font-size: 10px;
          color: #f59e0b;
          position: absolute;
          right: 2px;
          top: 2px;
        }
        
        .fc-day-sun .fc-timegrid-col {
          background-color: #fecaca !important;
          pointer-events: none;
        }
        
        .fc-day-sun .fc-col-header-cell {
          background-color: #fecaca !important;
          color: #ef4444 !important;
        }
        
        .fc-day-sun .fc-col-header-cell:after {
          content: " ❌ CLOSED";
          font-size: 10px;
          font-weight: bold;
        }
        
        /* Invalid selection highlighting */
        .fc-highlight.fc-invalid {
          background-color: rgba(239, 68, 68, 0.2) !important;
        }
        
        /* Constraint violation feedback */
        .fc-event-dragging.fc-invalid {
          opacity: 0.3;
          transform: scale(0.95);
          box-shadow: 0 0 0 2px #ef4444;
        }

        /* Resource hierarchy styling */
        .fc-resource-timeline-lane[data-resource-id^="shop-"] {
          background-color: #f9fafb;
          font-weight: 700;
          color: #1f2937;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .fc-resource-timeline-lane[data-resource-id^="station-"] {
          background-color: #f3f4f6;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #d1d5db;
          font-style: italic;
        }
        
        .fc-resource-timeline-lane[data-resource-id^="shop-"] .fc-timeline-lane-frame {
          padding-left: 8px !important;
        }
        
        .fc-resource-timeline-lane[data-resource-id^="station-"] .fc-timeline-lane-frame {
          padding-left: 20px !important;
        }
        
        .fc-resource-timeline-lane:not([data-resource-id^="shop-"]):not([data-resource-id^="station-"]) .fc-timeline-lane-frame {
          padding-left: 35px !important;
        }

        /* Resource cell styling for hierarchy */
        .fc-resource-cell[data-resource-id^="shop-"] {
          background-color: #f9fafb;
          font-weight: 700;
        }
        
        .fc-resource-cell[data-resource-id^="station-"] {
          background-color: #f3f4f6;
          font-weight: 600;
          font-style: italic;
          padding-left: 20px !important;
        }
        
        .fc-resource-cell:not([data-resource-id^="shop-"]):not([data-resource-id^="station-"]) {
          padding-left: 35px !important;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .fc-col-header-cell {
            background-color: #1f2937;
          }
          
          .fc-scrollgrid,
          .fc-scrollgrid-section > td {
            background-color: #111827;
            border-color: #374151;
          }
          
          .fc-event {
            border-color: #374151;
          }
          
          .fc-today {
            background-color: rgba(59, 130, 246, 0.1) !important;
          }
          
          .fc-resource-timeline-lane[data-resource-id^="shop-"] {
            background-color: #1f2937;
            color: #f9fafb;
          }
          
          .fc-resource-timeline-lane[data-resource-id^="station-"] {
            background-color: #374151;
            color: #d1d5db;
          }
          
          .fc-resource-cell[data-resource-id^="shop-"] {
            background-color: #1f2937;
            color: #f9fafb;
          }
          
          .fc-resource-cell[data-resource-id^="station-"] {
            background-color: #374151;
            color: #d1d5db;
          }
        }
      `}</style>
      </div>
    </div>
  )
}