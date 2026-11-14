import { mkdirSync, statSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { askpassPath } from "./git-auth.ts";

describe("git askpass helper", () => {
  const prev = process.env.FLIGHTDECK_DATA_DIR;

  beforeEach(() => {
    process.env.FLIGHTDECK_DATA_DIR = mkdtempSync(join(tmpdir(), "fd-ask-"));
    mkdirSync(process.env.FLIGHTDECK_DATA_DIR, { recursive: true });
  });
  afterEach(() => {
    if (prev) process.env.FLIGHTDECK_DATA_DIR = prev;
    else delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("installs askpass.mjs at 0700 in the data dir", () => {
    const path = askpassPath();
    expect(path.startsWith(process.env.FLIGHTDECK_DATA_DIR ?? "")).toBe(true);
    expect(statSync(path).mode & 0o777).toBe(0o700);
  });
});
