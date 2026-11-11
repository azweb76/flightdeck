import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ExecResult = { stdout: string; stderr: string; code: number };
export type ExecFn = (file: string, args: string[], opts?: ExecOpts) => Promise<ExecResult>;

export type ExecOpts = {
  cwd?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

export const defaultExec: ExecFn = async (file, args, opts = {}) => {
  try {
    const r = await execFileAsync(file, args, {
      cwd: opts.cwd,
      timeout: opts.timeoutMs ?? 30_000,
      env: { ...process.env, ...opts.env },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: r.stdout, stderr: r.stderr, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? e.message ?? String(err),
      code: typeof e.code === "number" ? e.code : 1,
    };
  }
};
