import { formatPreflight } from "./print.ts";
import { getPreflightReport } from "./report.ts";

const report = await getPreflightReport({ force: true });
console.info(formatPreflight(report));
if (!report.ok) process.exit(1);
