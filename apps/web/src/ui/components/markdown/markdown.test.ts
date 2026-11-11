import { describe, expect, it } from "vitest";
import { suggestions, tokenAt } from "./autocomplete.ts";

describe("markdown autocomplete", () => {
  it("finds @ and Jira tokens", () => {
    expect(tokenAt("hi @da", 6)?.token).toBe("@da");
    expect(tokenAt("see PROJ-1", 10)?.token).toBe("PROJ-1");
  });

  it("suggests issues from cache", () => {
    const hits = suggestions("PROJ", [
      {
        id: "jira:PROJ-9",
        source: "jira",
        key: "PROJ-9",
        title: "X",
        body: "",
        url: "",
        stage: "new",
        repos: [],
        repoWarning: "none",
        updatedAt: "",
      },
    ]);
    expect(hits[0]?.id).toBe("PROJ-9");
  });
});
