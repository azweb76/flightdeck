import { createFakeDriver } from "./fake.ts";
import { createSdkDriver } from "./sdk.ts";
import type { AgentDriver } from "./types.ts";

export type { AgentDriver, AgentEvent, AgentRunOpts } from "./types.ts";
export { createFakeDriver } from "./fake.ts";
export { createSdkDriver } from "./sdk.ts";
export { allowTool, isRiskyCommand } from "./permissions.ts";

let override: AgentDriver | undefined;

export function setAgentDriver(driver: AgentDriver | undefined): void {
  override = driver;
}

export function getAgentDriver(): AgentDriver {
  if (override) return override;
  if (process.env.FLIGHTDECK_AGENT === "fake" || process.env.FLIGHTDECK_DEMO === "1") {
    return createFakeDriver();
  }
  if (process.env.FLIGHTDECK_AGENT === "sdk") return createSdkDriver();
  return createFakeDriver();
}
