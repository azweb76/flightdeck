import { getSettings } from "../settings/index.ts";
import { checkCaps, type CapHit } from "./machine.ts";
import { dailySpendUsd } from "./store.ts";

export function evaluateSpend(spentRun: number, add: number): CapHit {
  const settings = getSettings();
  return checkCaps(spentRun, dailySpendUsd(), add, settings.dollarCapUsd, settings.dailyDollarCapUsd);
}

export function capMessage(hit: CapHit): string {
  if (hit === "run") return "This run hit the per-run dollar cap. Raise it in Settings or archive and try a smaller run.";
  if (hit === "daily") return "Today's spend hit the daily dollar cap. Raise it in Settings or wait until tomorrow.";
  return "";
}
