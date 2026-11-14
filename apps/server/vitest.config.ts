import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    reporters: ["dot"],
    env: { FLIGHTDECK_RUN_FAST: "1" },
  },
});
