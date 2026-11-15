export type AgentEvent = {
  kind: "text" | "ask" | "tool" | "usage" | "done" | "error";
  title: string;
  detail?: string;
  ask?: { prompt: string; options: { id: string; label: string }[] };
  costUsd?: number;
};

export type AgentRole = "shape" | "implement" | "review" | "plan" | "pr-review";

export type AgentRunOpts = {
  prompt: string;
  cwd?: string;
  model?: string;
  abort?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  role?: AgentRole;
};

export type AgentDriver = {
  run(opts: AgentRunOpts): AsyncIterable<AgentEvent>;
};
