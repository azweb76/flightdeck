import { describe, expect, it } from "vitest";
import { isAllowedExternalUrl, JIRA_API_TOKEN_URL } from "./external-url.ts";

describe("isAllowedExternalUrl", () => {
  it("allows the Atlassian API token page", () => {
    expect(isAllowedExternalUrl(JIRA_API_TOKEN_URL)).toBe(true);
    expect(isAllowedExternalUrl(`${JIRA_API_TOKEN_URL}/`)).toBe(true);
    expect(isAllowedExternalUrl(`${JIRA_API_TOKEN_URL}?utm=docs`)).toBe(true);
  });

  it("rejects other schemes, hosts, and paths", () => {
    expect(isAllowedExternalUrl("http://id.atlassian.com/manage-profile/security/api-tokens")).toBe(false);
    expect(isAllowedExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedExternalUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedExternalUrl("https://evil.com")).toBe(false);
    expect(isAllowedExternalUrl("https://id.atlassian.com.evil.com/manage-profile/security/api-tokens")).toBe(false);
    expect(isAllowedExternalUrl("https://id.atlassian.com/manage-profile/security")).toBe(false);
    expect(isAllowedExternalUrl("https://user:pass@id.atlassian.com/manage-profile/security/api-tokens")).toBe(false);
    expect(isAllowedExternalUrl("not a url")).toBe(false);
  });
});
