import { afterEach, describe, expect, it } from "vitest";
import { getAgentDriver, isFakeAgent, setAgentDriver } from "./driver.ts";

describe("getAgentDriver", () => {
  afterEach(() => {
    setAgentDriver(undefined);
    delete process.env.FLIGHTDECK_AGENT;
    delete process.env.FLIGHTDECK_DEMO;
  });

  it("defaults to the SDK driver, not the fake", () => {
    delete process.env.FLIGHTDECK_AGENT;
    delete process.env.FLIGHTDECK_DEMO;
    expect(isFakeAgent()).toBe(false);
  });

  it("uses the fake driver for demo and FLIGHTDECK_AGENT=fake", async () => {
    process.env.FLIGHTDECK_DEMO = "1";
    expect(isFakeAgent()).toBe(true);
    const kinds: string[] = [];
    for await (const ev of getAgentDriver().run({
      prompt: "kind\":\"refine_goal",
      cwd: ".",
      role: "refiner",
      model: "m",
      permissionMode: "auto",
    })) {
      kinds.push(ev.kind);
    }
    expect(kinds).toContain("done");
    delete process.env.FLIGHTDECK_DEMO;
    process.env.FLIGHTDECK_AGENT = "fake";
    expect(isFakeAgent()).toBe(true);
  });
});
