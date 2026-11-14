import { formatPreflight } from "./print.ts";
import { buildReport } from "./report.ts";

const report = await buildReport();
console.info(formatPreflight(report));
if (!report.ok) process.exit(1);
