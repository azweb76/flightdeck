import type { AgentRole, PermissionMode } from "@flightdeck/shared";

export type AgentEvent = {
  kind: "text" | "tool" | "tool_result" | "usage" | "error" | "ask" | "done";
  title: string;
  detail?: string;
  tool?: string;
  path?: string;
  tokensIn?: number;
  tokensOut?: number;
  ask?: { prompt: string; options: { id: string; label: string }[] };
  sdkSessionId?: string;
};

export type AgentRunOpts = {
  prompt: string;
  cwd: string;
  role: AgentRole;
  model: string;
  permissionMode: PermissionMode;
  resumeSessionId?: string;
  abort?: AbortSignal;
};

export type AgentDriver = {
  run(opts: AgentRunOpts): AsyncIterable<AgentEvent>;
};
