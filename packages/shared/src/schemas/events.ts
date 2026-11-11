import { z } from "zod";

export const AppEventTypeSchema = z.enum([
  "settings.updated",
  "repos.updated",
  "setup.updated",
  "issues.updated",
  "runs.updated",
  "run.event",
  "questions.updated",
  "notifications.updated",
  "goals.updated",
  "reviews.updated",
  "improvements.updated",
]);

export const AppEventSchema = z.object({
  type: AppEventTypeSchema,
  at: z.string(),
  payload: z.unknown().optional(),
});
export type AppEvent = z.infer<typeof AppEventSchema>;
