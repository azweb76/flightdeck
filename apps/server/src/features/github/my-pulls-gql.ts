import type { OwnPr } from "@flightdeck/shared";
import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";
import { summarize } from "./checks.ts";
import { reduceReviews } from "./reviews.ts";
import { prNeedsYou } from "@flightdeck/shared";

const QUERY = `query($q: String!) {
  search(query: $q, type: ISSUE, first: 50) {
    nodes {
      ... on PullRequest {
        number title url isDraft updatedAt
        repository { nameWithOwner }
        latestReviews(first: 20) { nodes { state author { login } } }
        commits(last: 1) {
          nodes {
            commit {
              oid
              statusCheckRollup {
                state
                contexts {
                  ... on CheckRun { status conclusion }
                  ... on StatusContext { state }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

type GqlPr = {
  number?: number;
  title?: string;
  url?: string;
  isDraft?: boolean;
  updatedAt?: string;
  repository?: { nameWithOwner?: string };
  latestReviews?: { nodes?: { state?: string; author?: { login?: string } }[] };
  commits?: {
    nodes?: {
      commit?: {
        oid?: string;
        statusCheckRollup?: {
          state?: string;
          contexts?: { status?: string; conclusion?: string | null; state?: string }[];
        };
      };
    }[];
  };
};

export async function listAuthoredPullsGql(token: string, fetchFn: FetchFn): Promise<OwnPr[]> {
  const octokit = createOctokit(token, fetchFn);
  const res = await githubCall(() => octokit.graphql<{ search?: { nodes?: GqlPr[] } }>(QUERY, { q: "is:pr is:open author:@me archived:false" }));
  return (res.search?.nodes ?? []).filter((n) => n?.number && n.repository?.nameWithOwner).map(toOwnPr);
}

function toOwnPr(node: GqlPr): OwnPr {
  const repoSlug = node.repository?.nameWithOwner ?? "";
  const number = node.number ?? 0;
  const review = reduceReviews(node.latestReviews?.nodes ?? []);
  const commit = node.commits?.nodes?.[0]?.commit;
  const rollup = commit?.statusCheckRollup;
  const contexts = rollup?.contexts ?? [];
  const runs = contexts.filter((c) => c.status || c.conclusion);
  const statuses = contexts.filter((c) => c.state && !c.status);
  const ci = summarize(
    commit?.oid ?? "",
    String(rollup?.state ?? "").toLowerCase(),
    runs.map((c) => ({ status: c.status?.toLowerCase(), conclusion: c.conclusion?.toLowerCase() ?? null })),
    statuses.map((c) => ({ state: c.state?.toLowerCase() })),
  ).state;
  return {
    id: `github:${repoSlug}#${number}`,
    repoSlug,
    number,
    title: node.title ?? "",
    url: node.url ?? "",
    draft: Boolean(node.isDraft),
    ci,
    review,
    needsYou: prNeedsYou({ review, ci, ciRound: 0 }),
    ciRound: 0,
    updatedAt: node.updatedAt ?? new Date().toISOString(),
  };
}
