import { createFakeDriver } from "./fake.ts";
import { createSdkDriver } from "./sdk.ts";
import type { AgentDriver } from "./types.ts";

let override: AgentDriver | undefined;

export function setAgentDriver(driver: AgentDriver | undefined): void {
  override = driver;
}

/** SDK is the product default. Fake is tests/demo only (`FLIGHTDECK_AGENT=fake` or `FLIGHTDECK_DEMO=1`). */
export function getAgentDriver(): AgentDriver {
  if (override) return override;
  if (process.env.FLIGHTDECK_AGENT === "fake" || process.env.FLIGHTDECK_DEMO === "1") {
    return createFakeDriver();
  }
  return createSdkDriver();
}

export function isFakeAgent(): boolean {
  return Boolean(override) || process.env.FLIGHTDECK_AGENT === "fake" || process.env.FLIGHTDECK_DEMO === "1";
}
