import {
  nextNeedsYouCount,
  priorityRank,
  sortNextItems,
  type NextItem,
} from "@flightdeck/shared";
import { listBoardPrs } from "../board-prs/store.ts";
import { loadIssues } from "../issues/store.ts";
import { listQuestions } from "../questions/store.ts";
import { listRuns } from "../runs/store.ts";
import { hiddenByInbox } from "./store.ts";

export function assembleNext(): NextItem[] {
  return sortNextItems(rawNext().filter((r) => !hiddenByInbox(r.item.id, r.snap)).map((r) => r.item));
}

export function nextBadge(): number {
  return nextNeedsYouCount(assembleNext());
}

export function snapshotFor(id: string): string | undefined {
  return rawNext().find((r) => r.item.id === id)?.snap;
}

function rawNext(): { item: NextItem; snap: string }[] {
  return [...waiting(), ...fixPrs(), ...reviews(), ...issues()];
}

function waiting(): { item: NextItem; snap: string }[] {
  return listRuns()
    .filter((r) => r.status === "asking")
    .map((r) => {
      const q = listQuestions(r.id).find((x) => x.status === "open");
      return {
        snap: `${r.updatedAt}|${r.pauseReason ?? ""}`,
        item: {
          id: `run:${r.id}`,
          bucket: "waiting" as const,
          key: r.issueKey,
          title: r.pauseReason || r.issueTitle,
          repo: r.repoSlug,
          source: "run" as const,
          action: "answer" as const,
          priority: 0,
          ageMs: Date.now() - Date.parse(r.updatedAt),
          statusChips: ["Waiting on you"],
          runId: r.id,
          question: q ? { prompt: q.prompt, options: q.options } : undefined,
        },
      };
    });
}

function fixPrs(): { item: NextItem; snap: string }[] {
  return listBoardPrs()
    .filter((p) => (p.state ?? "open") === "open" && p.role === "mine" && (p.ci === "failing" || p.review === "changes_requested"))
    .map((p) => ({
      snap: `${p.updatedAt}|${p.ci}|${p.review}`,
      item: {
        id: `pr:${p.id}`,
        bucket: "fix_prs" as const,
        key: `${p.repo}#${p.number}`,
        title: p.title,
        repo: p.repo,
        source: "pr" as const,
        action: "fix" as const,
        priority: priorityRank({ labels: p.labels }),
        ageMs: p.ageDays * 86_400_000,
        statusChips: [p.ci === "failing" ? "CI failing" : "Changes requested"],
        prId: p.id,
      },
    }));
}

function reviews(): { item: NextItem; snap: string }[] {
  return listBoardPrs()
    .filter((p) => (p.state ?? "open") === "open" && p.role === "review")
    .map((p) => ({
      snap: `${p.updatedAt}|${p.ci}|${p.review}`,
      item: {
        id: `pr:${p.id}`,
        bucket: "review" as const,
        key: `${p.repo}#${p.number}`,
        title: p.title,
        repo: p.repo,
        source: "pr" as const,
        action: "draft_review" as const,
        priority: priorityRank({ labels: p.labels }),
        ageMs: p.ageDays * 86_400_000,
        statusChips: ["Review requested"],
        prId: p.id,
      },
    }));
}

function issues(): { item: NextItem; snap: string }[] {
  return loadIssues()
    .filter((i) => !i.id.startsWith("pr:"))
    .map((i) => ({
    snap: i.updatedAt,
    item: {
      id: `issue:${i.id}`,
      bucket: "issues" as const,
      key: i.key,
      title: i.title,
      repo: i.repos[0] ? `${i.repos[0].owner}/${i.repos[0].name}` : undefined,
      source: i.source,
      action: "start" as const,
      priority: priorityRank({ jiraPriority: i.jiraPriority, labels: i.labels }),
      ageMs: Date.now() - Date.parse(i.updatedAt),
      statusChips: [i.stage, ...(i.viaPr ? ["via PR"] : [])],
      issueId: i.id,
    },
  }));
}
