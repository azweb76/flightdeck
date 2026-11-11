import type { BoardPr, PrCi, PrReviewState } from "@flightdeck/shared";

export type PrFilters = {
  repo?: string;
  ci?: PrCi;
  review?: PrReviewState;
  draft?: "yes" | "no";
};

export function filterPrs(prs: BoardPr[], tab: "mine" | "review", filters: PrFilters): BoardPr[] {
  return prs.filter((pr) => {
    if (tab === "mine" && pr.role !== "mine") return false;
    if (tab === "review" && pr.role !== "review") return false;
    if (filters.repo && pr.repo.toLowerCase() !== filters.repo.toLowerCase()) return false;
    if (filters.ci && pr.ci !== filters.ci) return false;
    if (filters.review && pr.review !== filters.review) return false;
    if (filters.draft === "yes" && !pr.draft) return false;
    if (filters.draft === "no" && pr.draft) return false;
    return true;
  });
}

export function readStoredFilters(tab: string): PrFilters {
  try {
    const raw = localStorage.getItem(`flightdeck.prs.${tab}`);
    return raw ? (JSON.parse(raw) as PrFilters) : {};
  } catch {
    return {};
  }
}

export function writeStoredFilters(tab: string, filters: PrFilters): void {
  localStorage.setItem(`flightdeck.prs.${tab}`, JSON.stringify(filters));
}
