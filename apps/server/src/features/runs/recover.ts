import { interruptLiveRuns } from "./store.ts";
import { publish } from "../events/index.ts";

/** Mark in-flight runs Interrupted after a process death. Call pump() so Resume can enqueue. */
export function recoverInterrupted(): number[] {
  if (process.env.FLIGHTDECK_DEMO === "1") return [];
  const ids = interruptLiveRuns();
  if (ids.length) publish("runs.updated");
  return ids;
}
