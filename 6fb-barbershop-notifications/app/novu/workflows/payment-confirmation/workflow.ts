import { workflow } from "@novu/framework";
import { renderPaymentConfirmationEmail } from "../../emails/payment-confirmation-email";
import { emailControlSchema, payloadSchema, smsControlSchema } from "./schemas";

export const paymentConfirmation = workflow(
  "payment-confirmation",
  async ({ step, payload }) => {
    // Send email confirmation
    await step.email(
      "send-payment-confirmation-email",
      async (controls) => {
        return {
          subject: `Payment Confirmed - Thank you, ${payload.customerName}!`,
          body: renderPaymentConfirmationEmail(controls, payload),
        };
      },
      {
        controlSchema: emailControlSchema,
      },
    );

    // Send SMS confirmation
    await step.sms(
      "send-payment-confirmation-sms",
      async (controls) => {
        return {
          body: controls.message
            .replace('{{customerName}}', payload.customerName)
            .replace('{{paymentAmount}}', payload.paymentAmount)
            .replace('{{serviceName}}', payload.serviceName)
            .replace('{{shopName}}', payload.shopName)
            .replace('{{transactionId}}', payload.transactionId),
        };
      },
      {
        controlSchema: smsControlSchema,
      },
    );

    // Send in-app notification
    await step.inApp("payment-confirmed", async () => {
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