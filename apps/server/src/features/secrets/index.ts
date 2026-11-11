import { chmodSync, mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { JIRA_TOKEN_ACCOUNT, KEYCHAIN_SERVICE } from "@flightdeck/shared";
import { defaultExec, type ExecFn } from "../exec/index.ts";
import { secretsDir, secretsFile } from "../../paths.ts";

export type SecretStore = {
  get(account?: string): Promise<string | undefined>;
  set(value: string, account?: string): Promise<void>;
  del(account?: string): Promise<void>;
};

export function createSecretStore(exec: ExecFn = defaultExec): SecretStore {
  return {
    get: (account = JIRA_TOKEN_ACCOUNT) => readSecret(exec, account),
    set: (value, account = JIRA_TOKEN_ACCOUNT) => writeSecret(exec, account, value),
    del: (account = JIRA_TOKEN_ACCOUNT) => deleteSecret(exec, account),
  };
}

async function readSecret(exec: ExecFn, account: string): Promise<string | undefined> {
  if (process.platform === "darwin") {
    const r = await exec("security", [
      "find-generic-password",
      "-s",
      KEYCHAIN_SERVICE,
      "-a",
      account,
      "-w",
    ]);
    if (r.code !== 0) return undefined;
    const v = r.stdout.trim();
    return v.length ? v : undefined;
  }
  const path = secretsFile(account);
  if (!existsSync(path)) return undefined;
  const v = readFileSync(path, "utf8").trim();
  return v.length ? v : undefined;
}

async function writeSecret(exec: ExecFn, account: string, value: string): Promise<void> {
  if (process.platform === "darwin") {
    const r = await exec("security", [
      "add-generic-password",
      "-U",
      "-s",
      KEYCHAIN_SERVICE,
      "-a",
      account,
      "-w",
      value,
    ]);
    if (r.code !== 0) throw new Error(`Keychain write failed: ${r.stderr}`);
    return;
  }
  const dir = secretsDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  const path = secretsFile(account);
  writeFileSync(path, value, { encoding: "utf8", mode: 0o600 });
  chmodSync(path, 0o600);
}

async function deleteSecret(exec: ExecFn, account: string): Promise<void> {
  if (process.platform === "darwin") {
    await exec("security", ["delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", account]);
    return;
  }
  const path = secretsFile(account);
  if (existsSync(path)) unlinkSync(path);
}
