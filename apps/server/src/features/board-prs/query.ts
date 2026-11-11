/** One GraphQL search page: authored and/or review-requested PRs with CI, reviews, and closing issues. */
export const PR_SEARCH_QUERY = `query($q:String!,$after:String){viewer{login}search(query:$q,type:ISSUE,first:50,after:$after){pageInfo{hasNextPage endCursor}nodes{...on PullRequest{number title body url createdAt updatedAt isDraft headRefName author{login}repository{nameWithOwner}headRepository{nameWithOwner isFork viewerPermission}reviewDecision reviewRequests(first:10){nodes{requestedReviewer{...on User{login}}}}reviewThreads(first:40){nodes{isResolved}}closingIssuesReferences(first:20){nodes{number title url repository{nameWithOwner}}}commits(last:1){nodes{commit{statusCheckRollup{state}}}}}}}}`;

export function prSearchQuery(opts: { authored: boolean; review: boolean; since?: string }): string | undefined {
  if (!opts.authored && !opts.review) return undefined;
  const who =
    opts.authored && opts.review
      ? "(author:@me OR review-requested:@me)"
      : opts.authored
        ? "author:@me"
        : "review-requested:@me";
  const since = opts.since ? ` updated:>=${opts.since.slice(0, 10)}` : "";
  return `is:pr is:open archived:false ${who}${since}`;
}
