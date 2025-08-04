// FullCalendar Premium Configuration
// Using the free trial license for development

export const FULLCALENDAR_LICENSE_KEY = 'CC-Attribution-NonCommercial-NoDerivatives'

// Premium features configuration
export const premiumConfig = {
  // Enable premium features during development
  schedulerLicenseKey: FULLCALENDAR_LICENSE_KEY,
  
  // Resource views configuration
  resourceAreaHeaderContent: 'Staff',
  resourceAreaWidth: '25%',
  
  // Timeline configuration
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
  
  // Vertical resource view
  resourceTimeGridDay: {
    type: 'resourceTimeGrid',
    duration: { days: 1 },
    slotDuration: '00:30:00',
  },
  
  // Premium plugins features
  features: {
    // Drag and drop between resources
    resourceEditable: true,
    
    // Show resource lanes
    resourceLaneContent: true,
    
    // Resource grouping
    resourceGroupField: 'building',
    
    // Timeline features
    timeline: true,
    
    // Advanced interactions
    eventResizableFromStart: true,
    
    // Print styling
    print: true,
    
    // Export features
    export: true,
  },
}

// Helper to check if we're using premium features
export function isPremiumEnabled() {
  // Check if the license key is valid (not the attribution key)
  return FULLCALENDAR_LICENSE_KEY !== 'CC-Attribution-NonCommercial-NoDerivatives'
}

// Get license message for UI
export function getLicenseMessage() {
  if (isPremiumEnabled()) {
    return null
  }
  return 'Using FullCalendar free version. Premium features require a license.'
}