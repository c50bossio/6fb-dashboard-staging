import { workflow } from "@novu/framework";
import { renderAppointmentConfirmationEmail } from "../../emails/appointment-confirmation-email";
import { emailControlSchema, payloadSchema, smsControlSchema } from "./schemas";

export const appointmentConfirmation = workflow(
  "appointment-confirmation",
  async ({ step, payload }) => {
    // Send email confirmation
    await step.email(
      "send-confirmation-email",
      async (controls) => {
        return {
          subject: `Appointment Confirmed - ${payload.customerName}`,
          body: renderAppointmentConfirmationEmail(controls, payload),
        };
      },
      {
        controlSchema: emailControlSchema,
      },
    );

    // Send SMS confirmation
    await step.sms(
      "send-confirmation-sms",
      async (controls) => {
        return {
          body: controls.message
            .replace('{{customerName}}', payload.customerName)
            .replace('{{serviceName}}', payload.serviceName)
            .replace('{{appointmentDate}}', payload.appointmentDate)
            .replace('{{appointmentTime}}', payload.appointmentTime)
            .replace('{{barberName}}', payload.barberName)
            .replace('{{shopName}}', payload.shopName)
            .replace('{{confirmationNumber}}', payload.confirmationNumber),
        };
      },
      {
        controlSchema: smsControlSchema,
      },
    );

    // Send in-app notification
    await step.inApp("appointment-confirmed", async () => {
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