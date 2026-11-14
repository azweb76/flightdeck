import { nodeTooOld } from "./check-node.ts";
import { printPreflight } from "./print.ts";
import { getPreflightReport } from "./report.ts";

export async function runStartupPreflight(): Promise<void> {
  const report = await getPreflightReport({ force: true });
  printPreflight(report);
  if (nodeTooOld(report.checks)) {
    console.error("Node.js is too old to run Flightdeck. Install Node 22.13+ and try again.");
    process.exit(1);
  }
}
