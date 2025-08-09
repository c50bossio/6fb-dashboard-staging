'use client'

import FullCalendar from '@fullcalendar/react'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import interactionPlugin from '@fullcalendar/interaction'

export default function SimpleProfessionalCalendar() {
  // Hardcoded test data
  const testResources = [
    { id: 'john', title: 'John Smith' },
    { id: 'sarah', title: 'Sarah Johnson' },
    { id: 'mike', title: 'Mike Brown' },
    { id: 'lisa', title: 'Lisa Davis' }
  ]
  
  // Create events for today
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  
  const testEvents = [
    {
      id: '1',
      title: 'John Doe - Haircut',
      start: `${year}-${month}-${day}T09:00:00`,
      end: `${year}-${month}-${day}T09:30:00`,
      resourceId: 'john',
      backgroundColor: '#3b82f6'
    },
    {
      id: '2',
      title: 'Jane Smith - Color',
      start: `${year}-${month}-${day}T10:00:00`,
      end: `${year}-${month}-${day}T11:30:00`,
      resourceId: 'sarah',
      backgroundColor: '#10b981'
    },
    {
      id: '3',
      title: 'Bob Wilson - Beard Trim',
      start: `${year}-${month}-${day}T11:00:00`,
      end: `${year}-${month}-${day}T11:30:00`,
      resourceId: 'mike',
      backgroundColor: '#f59e0b'
    },
    {
      id: '4',
      title: 'Alice Brown - Kids Cut',
      start: `${year}-${month}-${day}T14:00:00`,
      end: `${year}-${month}-${day}T14:30:00`,
      resourceId: 'lisa',
      backgroundColor: '#8b5cf6'
    },
    {
      id: '5',
      title: 'Charlie Davis - Haircut',
      start: `${year}-${month}-${day}T15:00:00`,
      end: `${year}-${month}-${day}T15:45:00`,
      resourceId: 'john',
      backgroundColor: '#3b82f6'
    }
  ]
  
  console.log('Simple Calendar - Test Events:', testEvents)
  
  return (
    <div className="simple-calendar-wrapper">
      <FullCalendar
        plugins={[resourceTimeGridPlugin, interactionPlugin]}
        initialView="resourceTimeGridDay"
        
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimeGridDay,resourceTimeGridWeek'
        }}
        
        resources={testResources}
        events={testEvents}
        
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        slotDuration="00:30:00"
        height="700px"
        
        editable={true}
        selectable={true}
        
        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
        resourceAreaHeaderContent="Barbers"
        resourceAreaWidth="15%"
      />
    </div>
  )
}