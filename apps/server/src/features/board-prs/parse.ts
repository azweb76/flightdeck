import type { BoardPr, PrCi, PrReviewState } from "@flightdeck/shared";
import { parseJiraKeys } from "@flightdeck/shared";

type Node = Record<string, unknown>;

export function parseSearchPayload(raw: string, viewerLogin: string, projectKeys: string[]): BoardPr[] {
  const body = JSON.parse(raw) as { data?: { viewer?: { login?: string }; search?: { nodes?: unknown[] } } };
  const login = body.data?.viewer?.login ?? viewerLogin;
  const nodes = body.data?.search?.nodes ?? [];
  return nodes.map((n) => toPr(n as Node, login, projectKeys)).filter((p): p is BoardPr => Boolean(p));
}

export function parseViewerLogin(raw: string): string {
  try {
    const body = JSON.parse(raw) as { data?: { viewer?: { login?: string } } };
    return body.data?.viewer?.login ?? "";
  } catch {
    return "";
  }
}

export function parsePageInfo(raw: string): { hasNextPage: boolean; endCursor?: string } {
  try {
    const body = JSON.parse(raw) as {
      data?: { search?: { pageInfo?: { hasNextPage?: boolean; endCursor?: string } } };
    };
    const info = body.data?.search?.pageInfo;
    return { hasNextPage: Boolean(info?.hasNextPage), endCursor: info?.endCursor };
  } catch {
    return { hasNextPage: false };
  }
}

function toPr(node: Node, viewer: string, projectKeys: string[]): BoardPr | undefined {
  const repo = String((node.repository as Node | undefined)?.nameWithOwner ?? "");
  const number = Number(node.number);
  if (!repo || !number) return undefined;
  const head = (node.headRepository as Node | undefined) ?? {};
  const headRepo = String(head.nameWithOwner ?? repo);
  const author = String((node.author as Node | undefined)?.login ?? "");
  const perm = String(head.viewerPermission ?? "");
  const viewerCanPush = ["WRITE", "MAINTAIN", "ADMIN"].includes(perm);
  const isFork = Boolean(head.isFork) || headRepo.toLowerCase() !== repo.toLowerCase();
  const threads = ((node.reviewThreads as { nodes?: { isResolved?: boolean }[] } | undefined)?.nodes ?? []).filter(
    (t) => !t.isResolved,
  );
  const closing = closingRefs(node);
  const title = String(node.title ?? "");
  const body = String(node.body ?? "");
  const headRef = String(node.headRefName ?? "");
  const createdAt = String(node.createdAt ?? new Date().toISOString());
  const pr: BoardPr = {
    id: `${repo}#${number}`,
    number,
    title,
    url: String(node.url ?? ""),
    repo,
    role: author.toLowerCase() === viewer.toLowerCase() ? "mine" : "review",
    ci: ciOf(node),
    review: reviewOf(node, threads.length),
    unresolvedThreads: threads.length,
    draft: Boolean(node.isDraft),
    ageDays: ageDays(createdAt),
    headRef,
    headRepo,
    viewerCanPush,
    isFork,
    body,
    createdAt,
    updatedAt: String(node.updatedAt ?? createdAt),
    linkedIssueIds: linkIds(closing, title, headRef, body, projectKeys),
  };
  return pr;
}

export function linkIds(
  closing: { repo: string; number: number }[],
  title: string,
  headRef: string,
  body: string,
  projectKeys: string[],
): string[] {
  const ids = closing.map((c) => `github:${c.repo}#${c.number}`);
  for (const key of parseJiraKeys([title, headRef, body].join("\n"), projectKeys)) {
    ids.push(`jira:${key}`);
  }
  return [...new Set(ids)];
}

function closingRefs(node: Node): { repo: string; number: number }[] {
  const nodes = (node.closingIssuesReferences as { nodes?: Node[] } | undefined)?.nodes ?? [];
  return nodes
    .map((n) => {
      const repo = String((n.repository as Node | undefined)?.nameWithOwner ?? "");
      const number = Number(n.number);
      return repo && number ? { repo, number } : undefined;
    })
    .filter((x): x is { repo: string; number: number } => Boolean(x));
}

function ciOf(node: Node): PrCi {
  const commits = (node.commits as { nodes?: Node[] } | undefined)?.nodes ?? [];
  const rollup = (commits[0]?.commit as Node | undefined)?.statusCheckRollup as { state?: string } | undefined;
  const state = (rollup?.state ?? "PENDING").toUpperCase();
  if (state === "SUCCESS") return "passing";
  if (state === "FAILURE" || state === "ERROR") return "failing";
  return "pending";
}

function reviewOf(node: Node, unresolved: number): PrReviewState {
  const decision = String(node.reviewDecision ?? "").toUpperCase();
  if (decision === "APPROVED") return "approved";
  if (decision === "CHANGES_REQUESTED") return "changes_requested";
  if (unresolved > 0) return "pending";
  return "pending";
}

function ageDays(createdAt: string): number {
  const ms = Date.now() - Date.parse(createdAt);
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.floor(ms / 86_400_000);
}
