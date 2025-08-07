import { z } from "zod";
import { emailControlSchema, payloadSchema, smsControlSchema } from "./schemas";

export type EmailControls = z.infer<typeof emailControlSchema>;
export type Payload = z.infer<typeof payloadSchema>;
export type SmsControls = z.infer<typeof smsControlSchema>;