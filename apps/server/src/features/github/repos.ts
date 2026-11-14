import type { CatalogRepo } from "@flightdeck/shared";
import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";

export async function listRepos(token: string, fetchFn: FetchFn): Promise<CatalogRepo[]> {
  const octokit = createOctokit(token, fetchFn);
  const rows = await githubCall(() =>
    octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      affiliation: "owner,collaborator,organization_member",
      per_page: 100,
    }),
  );
  return rows
    .map((row) => {
      const [owner, name] = (row.full_name ?? "").split("/");
      return owner && name ? { owner, name, localPath: "" } : undefined;
    })
    .filter((x): x is CatalogRepo => Boolean(x));
}
