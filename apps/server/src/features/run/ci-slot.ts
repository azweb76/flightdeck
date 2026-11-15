import type { Change } from "@flightdeck/shared";
import { emitChange, log } from "./emit.ts";
import { occupiesSlot } from "./machine.ts";
import { pumpQueue } from "./queue.ts";
import { getChange } from "./store.ts";

export async function waitForFixSlot(change: Change): Promise<boolean> {
  const current = getChange(change.id);
  if (!current || current.status === "archived") return false;
  if (current.status === "fixing_ci" && occupiesSlot(current.status)) {
    Object.assign(change, current);
    return true;
  }
  park(change);
  pumpQueue();
  for (;;) {
    const row = getChange(change.id);
    if (!row || row.status === "archived") return false;
    if (row.status === "fixing_ci") {
      Object.assign(change, row);
      return true;
    }
    await new Promise((r) => setTimeout(r, process.env.FLIGHTDECK_RUN_FAST === "1" ? 5 : 250));
  }
}

function park(change: Change): void {
  if (change.ciPhase === "queued") return;
  change.status = "watching_ci";
  change.ciPhase = "queued";
  log(change, { kind: "system", title: "queued", detail: "Waiting for a free slot" });
  emitChange(change);
}
