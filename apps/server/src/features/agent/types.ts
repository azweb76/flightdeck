export type AgentEvent = {
  kind: "text" | "ask" | "tool" | "usage" | "done" | "error";
  title: string;
  detail?: string;
  ask?: { prompt: string; options: { id: string; label: string }[] };
};

export type AgentRunOpts = {
  prompt: string;
  cwd?: string;
  model?: string;
  abort?: AbortSignal;
  env?: NodeJS.ProcessEnv;
};

export type AgentDriver = {
  run(opts: AgentRunOpts): AsyncIterable<AgentEvent>;
};
