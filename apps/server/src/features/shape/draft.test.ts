import { describe, expect, it } from "vitest";
import { emptyDraft } from "@flightdeck/shared";
import { mergeDraft } from "./draft.ts";

describe("mergeDraft", () => {
  it("updates live sections from fenced JSON", () => {
    const next = mergeDraft(
      emptyDraft(),
      'Here\n```json\n{"title":"CSV","goal":"Export invoices","acceptance":"- csv"}\n```',
    );
    expect(next.title).toBe("CSV");
    expect(next.goal).toBe("Export invoices");
    expect(next.acceptance).toBe("- csv");
  });

  it("keeps the previous draft when the model does not emit JSON", () => {
    const cur = { ...emptyDraft(), title: "Keep" };
    expect(mergeDraft(cur, "Just a question")).toEqual(cur);
  });
});
