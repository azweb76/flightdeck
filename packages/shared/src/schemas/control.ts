import { z } from "zod";

export const QuestionSchema = z.object({
  toolUseId: z.string().optional(),
  id: z.number().int().positive(),
  runId: z.number().int().positive(),
  prompt: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })).default([]),
  allowFreeText: z.boolean().default(true),
  answer: z.string().optional(),
  status: z.enum(["open", "answered"]),
  createdAt: z.string(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const MidRunMessageSchema = z.object({
  text: z.string().min(1),
  target: z.enum(["current", "next", "run"]),
});
export type MidRunMessage = z.infer<typeof MidRunMessageSchema>;

export const NotificationSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  body: z.string(),
  href: z.string().optional(),
  read: z.boolean(),
  createdAt: z.string(),
});
export type AppNotification = z.infer<typeof NotificationSchema>;
