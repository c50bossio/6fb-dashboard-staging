
// Using standard FullCalendar version without premium features
// export const FULLCALENDAR_LICENSE_KEY = process.env.NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY || 'CC-Attribution-NonCommercial-NoDerivatives'

// Premium config disabled for license compliance
// export const premiumConfig = {
//   schedulerLicenseKey: FULLCALENDAR_LICENSE_KEY,
//   
//   resourceAreaHeaderContent: 'Staff',
//   resourceAreaWidth: '25%',
//   
//   resourceTimelineDay: {
//     type: 'resourceTimeline',
//     duration: { days: 1 },
//     slotDuration: '00:30:00',
//     resourceAreaColumns: [
//       {
//         field: 'title',
//         headerContent: 'Barber',
//       },
//       {
//         field: 'businessHours',
//         headerContent: 'Hours',
//       },
//     ],
//   },
//   
//   resourceTimelineWeek: {
//     type: 'resourceTimeline', 
//     duration: { days: 7 },
//     slotDuration: '01:00:00',
//     resourceAreaColumns: [
//       {
//         field: 'title',
//         headerContent: 'Barber',
//       },
//       {
//         field: 'capacity',
//         headerContent: 'Capacity',
//       },
//     ],
//   },
//   
//   resourceTimeGridDay: {
//     type: 'resourceTimeGrid',
//     duration: { days: 1 },
//     slotDuration: '00:30:00',
//   },
//   
//   features: {
//     resourceEditable: true,
//     
//     resourceLaneContent: true,
//     
//     resourceGroupField: 'building',
//     
//     timeline: true,
//     
//     eventResizableFromStart: true,
//     
//     print: true,
//     
//     export: true,
//   },
// }

// Standard (free) configuration - no premium features
export const standardConfig = {
  plugins: ['dayGrid', 'timeGrid', 'list', 'interaction'],
  
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'timeGridDay,timeGridWeek,dayGridMonth,listWeek'
  },
  
  views: {
    dayGridMonth: {
      buttonText: 'Month'
    },
    timeGridWeek: {
      buttonText: 'Week'
    },
    timeGridDay: {
      buttonText: 'Day'
    },
    listWeek: {
      buttonText: 'Agenda'
    }
  },
  
  features: {
    editable: true,
    selectable: true,
    nowIndicator: true,
    eventResizable: true,
    eventDraggable: true
  }
}

export function isPremiumEnabled() {
  // Premium features are disabled for license compliance
  return false
}

export function getLicenseMessage() {
  return 'Using FullCalendar free version for license compliance. Premium features disabled.'
}