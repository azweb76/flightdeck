import { describe, expect, it } from "vitest";
import { prSearchQueries } from "./query.ts";

describe("prSearchQueries", () => {
  it("uses the viewer login instead of @me", () => {
    const qs = prSearchQueries({ authored: true, review: true, login: "azweb76", sinceDay: "2026-11-04" });
    expect(qs).toEqual([
      "is:pr is:open archived:false author:azweb76",
      "is:pr archived:false (is:merged OR is:closed) updated:>=2026-11-04 author:azweb76",
      "is:pr is:open archived:false review-requested:azweb76",
      "is:pr archived:false (is:merged OR is:closed) updated:>=2026-11-04 reviewed-by:azweb76",
    ]);
    expect(qs.join(" ")).not.toContain("@me");
  });

  it("omits a side when that toggle is off", () => {
    expect(prSearchQueries({ authored: true, review: false, login: "dan", sinceDay: "2026-11-04" })).toEqual([
      "is:pr is:open archived:false author:dan",
      "is:pr archived:false (is:merged OR is:closed) updated:>=2026-11-04 author:dan",
    ]);
    expect(prSearchQueries({ authored: false, review: true, login: "dan", sinceDay: "2026-11-04" })).toEqual([
      "is:pr is:open archived:false review-requested:dan",
      "is:pr archived:false (is:merged OR is:closed) updated:>=2026-11-04 reviewed-by:dan",
    ]);
  });

  it("returns nothing without a login or with both toggles off", () => {
    expect(prSearchQueries({ authored: true, review: true, login: "" })).toEqual([]);
    expect(prSearchQueries({ authored: false, review: false, login: "dan" })).toEqual([]);
  });
});
