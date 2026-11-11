import { z } from "zod";

export const AgentRoleSchema = z.enum([
  "refiner",
  "planner",
  "implementer",
  "reviewer",
  "session_reviewer",
]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const PermissionModeSchema = z.enum([
  "auto",
  "acceptEdits",
  "default",
  "dontAsk",
  "bypassPermissions",
  "plan",
]);
export type PermissionMode = z.infer<typeof PermissionModeSchema>;
