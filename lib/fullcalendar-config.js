
export const FULLCALENDAR_LICENSE_KEY = process.env.NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY || 'CC-Attribution-NonCommercial-NoDerivatives'

export const premiumConfig = {
  schedulerLicenseKey: FULLCALENDAR_LICENSE_KEY,
  
  resourceAreaHeaderContent: 'Staff',
  resourceAreaWidth: '25%',
  
  resourceTimelineDay: {
    type: 'resourceTimeline',
    duration: { days: 1 },
    slotDuration: '00:30:00',
    resourceAreaColumns: [
      {
        field: 'title',
        headerContent: 'Barber',
      },
      {
        field: 'businessHours',
        headerContent: 'Hours',
      },
    ],
  },
  
  resourceTimelineWeek: {
    type: 'resourceTimeline', 
    duration: { days: 7 },
    slotDuration: '01:00:00',
    resourceAreaColumns: [
      {
        field: 'title',
        headerContent: 'Barber',
      },
      {
        field: 'capacity',
        headerContent: 'Capacity',
      },
    ],
  },
  
  resourceTimeGridDay: {
    type: 'resourceTimeGrid',
    duration: { days: 1 },
    slotDuration: '00:30:00',
  },
  
  features: {
    resourceEditable: true,
    
    resourceLaneContent: true,
    
    resourceGroupField: 'building',
    
    timeline: true,
    
    eventResizableFromStart: true,
    
    print: true,
    
    export: true,
  },
}

export function isPremiumEnabled() {
  return FULLCALENDAR_LICENSE_KEY !== 'CC-Attribution-NonCommercial-NoDerivatives'
}

export function getLicenseMessage() {
  if (isPremiumEnabled()) {
    return null
  }
  return 'Using FullCalendar free version. Premium features require a license.'
}