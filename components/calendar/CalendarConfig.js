import rrulePlugin from '@fullcalendar/rrule';
const RRuleService = require('../../services/rrule.service');
const TimezoneService = require('../../services/timezone.service');

/**
 * FullCalendar configuration for proper recurring event handling
 * This configuration ensures recurring events display at the correct time
 */

export const getCalendarConfig = (timezone = 'America/New_York') => {
  return {
    plugins: [],  // Plugins are added by the component
    
    timeZone: timezone,
    
    eventDataTransform: (eventData) => {
      if (eventData.extendedProps?.is_recurring && eventData.extendedProps?.recurring_pattern) {
        const pattern = eventData.extendedProps.recurring_pattern;
        
        if (pattern.rrule) {
          let rruleString = pattern.rrule;
          
          if (!rruleString.includes('DTSTART')) {
            const startDate = new Date(eventData.start);
            const dtstart = startDate.toISOString()
              .replace(/[-:]/g, '')
              .replace(/\\.\\d{3}/, '');
            
            rruleString = `DTSTART:${dtstart}\n${rruleString}`;
          }
          
          eventData.rrule = rruleString;
          
          if (pattern.duration) {
            eventData.duration = pattern.duration;
          } else if (eventData.end) {
            const start = new Date(eventData.start);
            const end = new Date(eventData.end);
            const durationMs = end - start;
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            
            if (hours > 0 || minutes > 0) {
              eventData.duration = 'PT';
              if (hours > 0) eventData.duration += `${hours}H`;
              if (minutes > 0) eventData.duration += `${minutes}M`;
            }
          }
          
          delete eventData.end;
          
          console.log('Transformed recurring event:', {
            id: eventData.id,
            title: eventData.title,
            rrule: eventData.rrule,
            duration: eventData.duration,
            timezone: timezone
          });
        }
      }
      
      return eventData;
    },
    
    eventDisplay: 'block',
    eventTextColor: '#ffffff',
    displayEventTime: true,
    displayEventEnd: true,
    
    eventTimeFormat: {
      hour: 'numeric',
      minute: '2-digit',
      meridiem: 'short'
    },
    
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00',
    slotDuration: '00:15:00',
    slotLabelInterval: '01:00:00',
    slotLabelFormat: {
      hour: 'numeric',
      minute: '2-digit',
      meridiem: 'short'
    },
    
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    
    businessHours: TimezoneService.getBusinessHours(timezone),
    
    firstDay: 0, // Sunday
    weekends: true,
    
    editable: true,
    droppable: true,
    selectable: true,
    selectMirror: true,
    eventResizableFromStart: true,
    
    dayMaxEvents: true,
    moreLinkClick: 'popover',
    
    nowIndicator: true,
    
    height: 'auto',
    aspectRatio: 1.8,
    
    loading: (isLoading) => {
      console.log('Calendar loading:', isLoading);
    },
    
    eventDidMount: (info) => {
      if (info.event.extendedProps?.is_recurring) {
        const icon = document.createElement('span');
        icon.innerHTML = '🔄';
        icon.style.marginLeft = '4px';
        icon.title = 'Recurring appointment';
        info.el.querySelector('.fc-event-title')?.appendChild(icon);
      }
      
      const status = info.event.extendedProps?.status;
      if (status === 'cancelled') {
        info.el.style.opacity = '0.5';
        info.el.style.textDecoration = 'line-through';
      }
    },
    
    validRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 6)), // 6 months back
      end: new Date(new Date().setFullYear(new Date().getFullYear() + 2)) // 2 years forward
    }
  };
};

/**
 * Process events from API for calendar display
 */
export const processCalendarEvents = (appointments, timezone = 'America/New_York') => {
  return appointments.map(appointment => {
    const event = {
      id: appointment.id,
      groupId: appointment.series_id || appointment.id,
      title: appointment.title || `${appointment.customer_name} - ${appointment.service_name}`,
      backgroundColor: appointment.barber_color || '#546355',
      borderColor: appointment.barber_color || '#546355',
      textColor: '#ffffff',
      display: 'block',
      resourceId: appointment.barber_id,
      extendedProps: {
        appointmentId: appointment.id,
        barber_id: appointment.barber_id,
        barber_name: appointment.barber_name,
        customer_id: appointment.customer_id,
        customer_name: appointment.customer_name,
        customer_email: appointment.customer_email,
        customer_phone: appointment.customer_phone,
        service_id: appointment.service_id,
        service_name: appointment.service_name,
        service_duration: appointment.service_duration,
        service_price: appointment.service_price,
        notes: appointment.notes,
        status: appointment.status,
        is_recurring: appointment.is_recurring,
        recurring_pattern: appointment.recurring_pattern
      }
    };
    
    if (appointment.is_recurring && appointment.recurring_pattern?.rrule) {
      event.start = appointment.start_time;
      if (appointment.end_time) {
        event.end = appointment.end_time;
      }
    } else {
      event.start = TimezoneService.fromUTC(appointment.start_time, timezone);
      event.end = TimezoneService.fromUTC(appointment.end_time, timezone);
    }
    
    return event;
  });
};

/**
 * Create event object for new appointment
 */
export const createCalendarEvent = (formData, timezone = 'America/New_York') => {
  const event = {
    title: `${formData.client_name} - ${formData.service_name || 'Unknown Service'}`,
    backgroundColor: formData.barber_color || '#546355',
    borderColor: formData.barber_color || '#546355',
    extendedProps: {
      barber_id: formData.barber_id,
      customer_name: formData.client_name,
      customer_email: formData.client_email,
      customer_phone: formData.client_phone,
      service_id: formData.service_id,
      notes: formData.notes,
      is_recurring: formData.is_recurring || false
    }
  };
  
  if (formData.is_recurring && formData.recurrence_pattern) {
    const rrule = RRuleService.createRRuleString(formData.recurrence_pattern);
    
    const { rrule: formattedRRule, duration } = RRuleService.toFullCalendarFormat(
      rrule,
      formData.start_time,
      formData.end_time
    );
    
    event.rrule = formattedRRule;
    event.duration = duration;
    event.extendedProps.recurring_pattern = {
      rrule: formattedRRule,
      duration: duration,
      timezone: timezone,
      ...formData.recurrence_pattern
    };
    
    event.start = formData.start_time;
  } else {
    event.start = formData.start_time;
    event.end = formData.end_time;
  }
  
  return event;
};

/**
 * Validate if an event can be modified
 */
export const canModifyEvent = (event, modification_type = 'all') => {
  const now = new Date();
  const eventStart = new Date(event.start);
  
  if (eventStart < now && modification_type !== 'this_and_future') {
    return {
      canModify: false,
      reason: 'Cannot modify past appointments'
    };
  }
  
  if (event.extendedProps?.status === 'cancelled') {
    return {
      canModify: false,
      reason: 'Cannot modify cancelled appointments'
    };
  }
  
  return {
    canModify: true,
    reason: null
  };
};

export default {
  getCalendarConfig,
  processCalendarEvents,
  createCalendarEvent,
  canModifyEvent
};