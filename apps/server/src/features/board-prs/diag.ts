import type { BoardPr, PrSyncDiag } from "@flightdeck/shared";
import { cacheGet, cacheSet } from "../cache/index.ts";

export type { PrSyncDiag };

const KEY = "prs:diag";

export function readPrDiag(): PrSyncDiag {
  const raw = cacheGet(KEY)?.body;
  if (!raw) return { authored: 0, reviewRequested: 0, total: 0, mergedClosed: 0 };
  try {
    const parsed = JSON.parse(raw) as Partial<PrSyncDiag>;
    return {
      syncedAt: parsed.syncedAt,
      viewerLogin: parsed.viewerLogin,
      query: parsed.query,
      authored: Number(parsed.authored ?? 0),
      reviewRequested: Number(parsed.reviewRequested ?? 0),
      total: Number(parsed.total ?? 0),
      mergedClosed: Number(parsed.mergedClosed ?? 0),
      error: parsed.error,
    };
  } catch {
    return { authored: 0, reviewRequested: 0, total: 0, mergedClosed: 0 };
  }
}

export function writePrDiag(diag: PrSyncDiag): void {
  cacheSet(KEY, JSON.stringify(diag));
}

export function countsFrom(prs: BoardPr[]): {
  authored: number;
  reviewRequested: number;
  total: number;
  mergedClosed: number;
} {
  const open = prs.filter((p) => (p.state ?? "open") === "open");
  return {
    authored: open.filter((p) => p.role === "mine").length,
    reviewRequested: open.filter((p) => p.role === "review").length,
    total: prs.length,
    mergedClosed: prs.filter((p) => (p.state ?? "open") !== "open").length,
  };
}
