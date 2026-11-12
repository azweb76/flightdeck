import { createFakeDriver } from "./fake.ts";
import { createSdkDriver } from "./sdk.ts";
import type { AgentDriver } from "./types.ts";

export type { AgentDriver, AgentEvent, AgentRunOpts } from "./types.ts";
export { createFakeDriver } from "./fake.ts";
export { createSdkDriver, mapSdkMessage } from "./sdk.ts";

let override: AgentDriver | undefined;

export function setAgentDriver(driver: AgentDriver | undefined): void {
  override = driver;
}

export function getAgentDriver(): AgentDriver {
  if (override) return override;
  if (process.env.FLIGHTDECK_DEMO === "1" || process.env.FLIGHTDECK_AGENT === "fake") return createFakeDriver();
  return createSdkDriver();
}
