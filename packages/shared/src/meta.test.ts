import { describe, expect, it } from "vitest";
import {
  APP_BUNDLE_ID,
  APP_DATA_DIR_NAME,
  APP_NAME,
  APP_SLUG,
  KEYCHAIN_SERVICE,
} from "./meta.ts";

describe("product identifiers", () => {
  it("uses Flightdeck everywhere the user will see it", () => {
    expect(APP_NAME).toBe("Flightdeck");
    expect(APP_SLUG).toBe("flightdeck");
    expect(APP_DATA_DIR_NAME).toBe(".flightdeck");
    expect(APP_BUNDLE_ID).toBe("dev.flightdeck.app");
    expect(KEYCHAIN_SERVICE).toBe("flightdeck");
  });
});
