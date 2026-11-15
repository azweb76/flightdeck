import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Linter } from "eslint";
import { oneSharedSurface } from "./one-shared-surface.js";

const linter = new Linter({ configType: "flat" });

function lint(code, filename) {
  return linter.verify(
    code,
    [
      {
        files: ["**/*.tsx"],
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 2022, sourceType: "module" } },
        plugins: { flightdeck: { rules: { "one-shared-surface": oneSharedSurface } } },
        rules: { "flightdeck/one-shared-surface": "error" },
      },
    ],
    { filename },
  );
}

describe("one-shared-surface", () => {
  it("flags a forked repo-search outside features/repos", () => {
    const msgs = lint(
      `export const F = () => <input data-testid="repo-search" />;`,
      "apps/web/src/pages/Fork.tsx",
    );
    assert.equal(msgs.filter((m) => m.ruleId === "flightdeck/one-shared-surface").length, 1);
  });

  it("allows repo-search inside features/repos", () => {
    const msgs = lint(
      `export const F = () => <input data-testid="repo-search" />;`,
      "apps/web/src/features/repos/RepoPicker.tsx",
    );
    assert.equal(msgs.filter((m) => m.ruleId === "flightdeck/one-shared-surface").length, 0);
  });
});
