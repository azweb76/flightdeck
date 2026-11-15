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
        files: ["**/*.{js,tsx}"],
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 2022, sourceType: "module" } },
        plugins: { flightdeck: { rules: { "one-shared-surface": oneSharedSurface } } },
        rules: { "flightdeck/one-shared-surface": "error" },
      },
    ],
    { filename },
  );
}

function hits(code, filename) {
  return lint(code, filename).filter((m) => m.ruleId === "flightdeck/one-shared-surface");
}

describe("one-shared-surface", () => {
  it("flags a forked repo-search outside features/repos", () => {
    assert.equal(hits(`export const F = () => <input data-testid="repo-search" />;`, "apps/web/src/pages/Fork.tsx").length, 1);
  });

  it("allows repo-search inside features/repos", () => {
    assert.equal(hits(`export const F = () => <input data-testid="repo-search" />;`, "apps/web/src/features/repos/RepoPicker.tsx").length, 0);
  });

  it("flags Autocomplete outside features/repos", () => {
    assert.equal(hits(`export const F = () => <Autocomplete options={[]} />;`, "apps/web/src/pages/Fork.tsx").length, 1);
  });

  it("allows Autocomplete inside features/repos", () => {
    assert.equal(hits(`export const F = () => <Autocomplete options={[]} />;`, "apps/web/src/features/repos/RepoPicker.tsx").length, 0);
  });

  it("flags Chat declared outside features/chat", () => {
    assert.equal(hits(`export function Chat() { return null; }`, "apps/web/src/pages/ChatPane.tsx").length, 1);
  });

  it("flags Composer and Thread declared outside features/chat", () => {
    assert.equal(hits(`export function Composer() { return null; }`, "apps/web/src/pages/Fork.tsx").length, 1);
    assert.equal(hits(`export function Thread() { return null; }`, "apps/web/src/pages/Fork.tsx").length, 1);
  });

  it("flags Markdown declared outside features/markdown", () => {
    assert.equal(hits(`export function Markdown() { return null; }`, "apps/web/src/pages/Draft.tsx").length, 1);
  });

  it("allows Chat declared inside features/chat", () => {
    assert.equal(hits(`export function Chat() { return null; }`, "apps/web/src/features/chat/Chat.tsx").length, 0);
  });

  it("flags react-markdown outside features/markdown", () => {
    assert.equal(hits(`import Md from "react-markdown"; export const F = () => <Md />;`, "apps/web/src/pages/Draft.tsx").length, 1);
  });

  it("flags pre-wrap bodies outside features/markdown", () => {
    const code = `export const F = () => <p sx={{ whiteSpace: "pre-wrap" }}>hi</p>;`;
    assert.equal(hits(code, "apps/web/src/features/chat/Thread.tsx").length, 1);
    assert.equal(hits(code, "apps/web/src/pages/Fork.tsx").length, 1);
  });

  it("allows pre-wrap on ClaudeForm and CheckRow", () => {
    const code = `export const F = () => <p sx={{ whiteSpace: "pre-wrap" }}>hi</p>;`;
    assert.equal(hits(code, "apps/web/src/pages/ClaudeForm.tsx").length, 0);
    assert.equal(hits(code, "apps/web/src/preflight/CheckRow.tsx").length, 0);
  });

  it("allows pre-wrap inside features/markdown", () => {
    const code = `export const F = () => <p sx={{ whiteSpace: "pre-wrap" }}>hi</p>;`;
    assert.equal(hits(code, "apps/web/src/features/markdown/Markdown.tsx").length, 0);
  });
});
