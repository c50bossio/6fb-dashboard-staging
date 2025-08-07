import { z } from "zod";

export const payloadSchema = z.object({
  customerName: z.string().describe("Customer's full name"),
  appointmentDate: z.string().describe("Date of appointment (YYYY-MM-DD)"),
  appointmentTime: z.string().describe("Time of appointment (HH:MM)"),
  serviceName: z.string().describe("Name of the service booked"),
  barberName: z.string().describe("Name of the assigned barber"),
  shopName: z.string().describe("Name of the barbershop"),
  shopAddress: z.string().describe("Address of the barbershop"),
  shopPhone: z.string().describe("Phone number of the barbershop"),
  hoursUntilAppointment: z.number().describe("Hours until appointment"),
  confirmationNumber: z.string().describe("Unique booking confirmation number"),
  inAppSubject: z.string().describe("Subject for in-app notification"),
  inAppBody: z.string().describe("Body for in-app notification"),
  inAppAvatar: z.string().optional().describe("Avatar for in-app notification"),
});

export const emailControlSchema = z.object({
  subject: z.string().default("Reminder: Appointment Tomorrow - {{customerName}}"),
  shopLogo: z.string().optional().describe("URL to shop logo"),
  primaryColor: z.string().default("#3B82F6").describe("Primary brand color"),
  showPrepTips: z.boolean().default(true).describe("Show preparation tips"),
});

export const smsControlSchema = z.object({
  message: z.string().default("Reminder: Your {{serviceName}} appointment is in {{hoursUntilAppointment}} hours ({{appointmentDate}} at {{appointmentTime}}) with {{barberName}} at {{shopName}}. See you soon!"),
});