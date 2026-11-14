import { GITHUB_NEEDED_SCOPES } from "@flightdeck/shared";
import { saveGithubToken } from "./client.ts";

const SCOPE = GITHUB_NEEDED_SCOPES.join(" ");

export type DeviceStart = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
  expires_in: number;
};

export async function startDeviceFlow(fetchFn: typeof fetch = fetch): Promise<DeviceStart> {
  const clientId = process.env.FLIGHTDECK_GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("Set FLIGHTDECK_GITHUB_CLIENT_ID to use GitHub device login");
  const res = await fetchFn("https://github.com/login/device/code", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, scope: SCOPE }),
  });
  const body = (await res.json()) as DeviceStart & { error?: string; error_description?: string };
  if (!res.ok || body.error) throw new Error(body.error_description || body.error || "Could not start GitHub device login");
  return body;
}

export async function pollDeviceFlow(deviceCode: string, fetchFn: typeof fetch = fetch): Promise<{ ok: true; login?: string } | { pending: true }> {
  const clientId = process.env.FLIGHTDECK_GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("Set FLIGHTDECK_GITHUB_CLIENT_ID to use GitHub device login");
  const res = await fetchFn("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, device_code: deviceCode, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }),
  });
  const body = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (body.error === "authorization_pending" || body.error === "slow_down") return { pending: true };
  if (!body.access_token) throw new Error(body.error_description || body.error || "GitHub device login failed");
  await saveGithubToken(body.access_token);
  return { ok: true };
}
