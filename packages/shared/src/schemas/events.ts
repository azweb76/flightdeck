import { z } from "zod";

export const AppEventTypeSchema = z.enum([
  "settings.updated",
  "repos.updated",
  "setup.updated",
  "issues.updated",
]);

export const AppEventSchema = z.object({
  type: AppEventTypeSchema,
  at: z.string(),
});
export type AppEvent = z.infer<typeof AppEventSchema>;
