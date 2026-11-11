import { spawn, type ChildProcess } from "node:child_process";

let proc: ChildProcess | undefined;

export function keepAwakeStart(): void {
  if (proc || process.platform !== "darwin") return;
  proc = spawn("caffeinate", ["-i"], { stdio: "ignore" });
}

export function keepAwakeStop(): void {
  proc?.kill();
  proc = undefined;
}

export function keepAwakeActive(): boolean {
  return Boolean(proc);
}
