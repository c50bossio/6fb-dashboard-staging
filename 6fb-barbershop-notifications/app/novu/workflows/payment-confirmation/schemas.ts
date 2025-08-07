import { z } from "zod";

export const payloadSchema = z.object({
  customerName: z.string().describe("Customer's full name"),
  customerEmail: z.string().email().describe("Customer's email address"),
  paymentAmount: z.string().describe("Payment amount (e.g., $50.00)"),
  paymentMethod: z.string().describe("Payment method (e.g., Visa ****1234)"),
  transactionId: z.string().describe("Transaction ID"),
  serviceName: z.string().describe("Name of the service paid for"),
  appointmentDate: z.string().optional().describe("Date of appointment if applicable"),
  appointmentTime: z.string().optional().describe("Time of appointment if applicable"),
  shopName: z.string().describe("Name of the barbershop"),
  receiptUrl: z.string().optional().describe("URL to download receipt"),
  inAppSubject: z.string().describe("Subject for in-app notification"),
  inAppBody: z.string().describe("Body for in-app notification"),
  inAppAvatar: z.string().optional().describe("Avatar for in-app notification"),
});

export const emailControlSchema = z.object({
  subject: z.string().default("Payment Confirmed - {{customerName}}"),
  shopLogo: z.string().optional().describe("URL to shop logo"),
  primaryColor: z.string().default("#10B981").describe("Primary brand color for success"),
  showReceiptLink: z.boolean().default(true).describe("Show download receipt link"),
  includeTaxBreakdown: z.boolean().default(false).describe("Include tax breakdown"),
});

export const smsControlSchema = z.object({
  message: z.string().default("Payment confirmed! {{paymentAmount}} for {{serviceName}} at {{shopName}}. Transaction ID: {{transactionId}}. Thank you!"),
});