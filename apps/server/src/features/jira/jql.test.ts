import { describe, expect, it } from "vitest";
import { jiraDateTime, jiraSearchJql, splitJqlOrderBy } from "./jql.ts";

describe("jiraSearchJql", () => {
  it("keeps ORDER BY after the incremental updated filter", () => {
    const jql = jiraSearchJql(
      "assignee = currentUser() AND statusCategory != Done ORDER BY updated",
      "2026-11-11T20:15:29.570Z",
    );
    expect(jql).toBe(
      '(assignee = currentUser() AND statusCategory != Done) AND updated >= "2026-11-11 20:15" ORDER BY updated',
    );
    expect(jql.indexOf("ORDER BY")).toBeGreaterThan(jql.indexOf("updated >="));
  });

  it("quotes yyyy-MM-dd HH:mm without wrapping ORDER BY when none is present", () => {
    expect(jiraSearchJql("assignee = currentUser()", "2026-01-02T03:04:05.000Z")).toBe(
      '(assignee = currentUser()) AND updated >= "2026-01-02 03:04"',
    );
  });
});

describe("splitJqlOrderBy", () => {
  it("splits Dan's board JQL", () => {
    expect(splitJqlOrderBy("assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC")).toEqual({
      clause: "assignee = currentUser() AND statusCategory != Done",
      orderBy: "ORDER BY updated DESC",
    });
  });
});

describe("jiraDateTime", () => {
  it("formats ISO stamps the way JQL accepts", () => {
    expect(jiraDateTime("2026-11-11T12:00:00.000Z")).toBe("2026-11-11 12:00");
  });
});
