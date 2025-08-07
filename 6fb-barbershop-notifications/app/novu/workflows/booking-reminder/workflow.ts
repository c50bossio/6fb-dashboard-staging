import { workflow } from "@novu/framework";
import { renderBookingReminderEmail } from "../../emails/booking-reminder-email";
import { emailControlSchema, payloadSchema, smsControlSchema } from "./schemas";

export const bookingReminder = workflow(
  "booking-reminder",
  async ({ step, payload }) => {
    // Send email reminder
    await step.email(
      "send-reminder-email",
      async (controls) => {
        const timeContext = payload.hoursUntilAppointment <= 24 ? "tomorrow" : 
                           payload.hoursUntilAppointment <= 48 ? "in 2 days" : 
                           "soon";
        
        return {
          subject: `Reminder: Your ${payload.serviceName} appointment ${timeContext}`,
          body: renderBookingReminderEmail(controls, payload),
        };
      },
      {
        controlSchema: emailControlSchema,
      },
    );

    // Send SMS reminder  
    await step.sms(
      "send-reminder-sms",
      async (controls) => {
        return {
          body: controls.message
            .replace('{{customerName}}', payload.customerName)
            .replace('{{serviceName}}', payload.serviceName)
            .replace('{{hoursUntilAppointment}}', payload.hoursUntilAppointment.toString())
            .replace('{{appointmentDate}}', payload.appointmentDate)
            .replace('{{appointmentTime}}', payload.appointmentTime)
            .replace('{{barberName}}', payload.barberName)
            .replace('{{shopName}}', payload.shopName),
        };
      },
      {
        controlSchema: smsControlSchema,
      },
    );

    // Send in-app notification
    await step.inApp("appointment-reminder", async () => {
      return {
        subject: payload.inAppSubject,
        body: payload.inAppBody,
        avatar: payload.inAppAvatar,
      };
    });
  },
  {
    payloadSchema,
  },
);