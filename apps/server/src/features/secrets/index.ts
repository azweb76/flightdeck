import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { GITHUB_TOKEN_ACCOUNT, JIRA_TOKEN_ACCOUNT, KEYCHAIN_SERVICE } from "@flightdeck/shared";
import { secretsDir, secretsFile } from "../../paths.ts";

export type SecretStorage = "keychain" | "file";

export type SecretStore = {
  get(account?: string): Promise<string | undefined>;
  set(value: string, account?: string): Promise<SecretStorage>;
  remove(account?: string): Promise<void>;
  storage(account?: string): Promise<SecretStorage | undefined>;
};

export function createSecretStore(): SecretStore {
  return {
    get: (account = JIRA_TOKEN_ACCOUNT) => readSecret(account),
    set: (value, account = JIRA_TOKEN_ACCOUNT) => writeSecret(account, value),
    remove: (account = JIRA_TOKEN_ACCOUNT) => deleteSecret(account),
    storage: (account = JIRA_TOKEN_ACCOUNT) => detectStorage(account),
  };
}

export { GITHUB_TOKEN_ACCOUNT };

async function readSecret(account: string): Promise<string | undefined> {
  const fromKeychain = await keychainGet(account);
  if (fromKeychain) return fromKeychain;
  return fileGet(account);
}

async function writeSecret(account: string, value: string): Promise<SecretStorage> {
  if (await keychainSet(account, value)) {
    fileDelete(account);
    return "keychain";
  }
  fileSet(account, value);
  return "file";
}

async function deleteSecret(account: string): Promise<void> {
  await keychainDelete(account);
  fileDelete(account);
}

async function detectStorage(account: string): Promise<SecretStorage | undefined> {
  if (await keychainGet(account)) return "keychain";
  if (fileGet(account)) return "file";
  return undefined;
}

function keychainOff(): boolean {
  return process.env.FLIGHTDECK_NO_KEYCHAIN === "1";
}

async function keychainGet(account: string): Promise<string | undefined> {
  if (keychainOff()) return undefined;
  try {
    const { Entry } = await import("@napi-rs/keyring");
    const v = new Entry(KEYCHAIN_SERVICE, account).getPassword();
    return v && v.trim() ? v : undefined;
  } catch {
    return undefined;
  }
}

async function keychainSet(account: string, value: string): Promise<boolean> {
  if (keychainOff()) return false;
  try {
    const { Entry } = await import("@napi-rs/keyring");
    new Entry(KEYCHAIN_SERVICE, account).setPassword(value);
    return true;
  } catch {
    return false;
  }
}

async function keychainDelete(account: string): Promise<void> {
  if (keychainOff()) return;
  try {
    const { Entry } = await import("@napi-rs/keyring");
    new Entry(KEYCHAIN_SERVICE, account).deletePassword();
  } catch {
    /* nothing stored */
  }
}

function fileGet(account: string): string | undefined {
  const path = secretsFile(account);
  if (!existsSync(path)) return undefined;
  const v = readFileSync(path, "utf8").trim();
  return v.length ? v : undefined;
}

function fileSet(account: string, value: string): void {
  const dir = secretsDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  const path = secretsFile(account);
  writeFileSync(path, value, { encoding: "utf8", mode: 0o600 });
  chmodSync(path, 0o600);
}

function fileDelete(account: string): void {
  const path = secretsFile(account);
  if (existsSync(path)) unlinkSync(path);
}
