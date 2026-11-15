import { filterOwnPrs, prNeedsYou, type OwnPr, type PrFilter } from "@flightdeck/shared";
import { listAuthoredPulls } from "../github/my-pulls.ts";
import { resolveGithubToken } from "../github/token.ts";
import { listChanges } from "../run/store.ts";
import { listStoredPulls } from "./store.ts";
import { demoPulls } from "./demo.ts";

export { seedDemoPulls } from "./demo.ts";
export { getStoredPull } from "./store.ts";

export async function listMyPulls(filter: PrFilter = "all"): Promise<OwnPr[]> {
  const prs = await loadPulls();
  return filterOwnPrs(prs.map(withChangeHints), filter);
}

export async function getMyPull(owner: string, name: string, number: number): Promise<OwnPr | undefined> {
  const id = `github:${owner}/${name}#${number}`;
  const prs = await loadPulls();
  return prs.map(withChangeHints).find((p) => p.id === id || (p.repoSlug === `${owner}/${name}` && p.number === number));
}

async function loadPulls(): Promise<OwnPr[]> {
  if (process.env.FLIGHTDECK_DEMO === "1") {
    const stored = listStoredPulls();
    return stored.length ? stored : demoPulls();
  }
  const token = await resolveGithubToken();
  if (!token?.token) return [];
  return listAuthoredPulls(token.token, fetch);
}

function withChangeHints(pr: OwnPr): OwnPr {
  const linked = listChanges().find((c) => c.prNumber === pr.number && c.repoSlug === pr.repoSlug);
  const ciRound = linked?.ciRound ?? pr.ciRound;
  const hinted = { ...pr, ciRound };
  const needsYou = linked ? prNeedsYou(hinted, linked.status) : pr.demo ? pr.needsYou : prNeedsYou(hinted);
  return { ...hinted, changeId: pr.changeId ?? linked?.id, needsYou };
}
