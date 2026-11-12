import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Linter } from "eslint";
import { noFloatingInputLabel } from "./no-floating-input-label.js";

const linter = new Linter({ configType: "flat" });
const config = [
  {
    files: ["**/*.tsx"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 2022, sourceType: "module" } },
    plugins: { flightdeck: { rules: { "no-floating-input-label": noFloatingInputLabel } } },
    rules: { "flightdeck/no-floating-input-label": "error" },
  },
];

function lint(code) {
  return linter.verify(code, config, { filename: "Field.tsx" });
}

describe("no-floating-input-label", () => {
  it("flags TextField label props", () => {
    const msgs = lint(`import { TextField } from "@mui/material";
export const F = () => <TextField label="Title" value="" />;`);
    assert.equal(msgs.filter((m) => m.ruleId === "flightdeck/no-floating-input-label").length, 1);
  });

  it("allows label-less TextField and FormField", () => {
    const msgs = lint(`import { TextField } from "@mui/material";
import { FormField } from "./form-field";
export const F = () => (
  <>
    <TextField placeholder="Search" />
    <FormField label="Title" value="" />
  </>
);`);
    assert.equal(msgs.filter((m) => m.ruleId === "flightdeck/no-floating-input-label").length, 0);
  });
});
