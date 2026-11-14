# github

Octokit (`@octokit/rest` + throttle + retry) for GitHub API. Throttle callbacks return false so `withBackoff` (30s cap) owns retries. git CLI stays for clone/fetch/worktree/commit/push, authenticated via `GIT_ASKPASS` (copied to `~/.flightdeck/askpass.mjs` at 0700) — never a token in remote URLs or `.git/config`. Token lives in the keychain (`@napi-rs/keyring`) or `~/.flightdeck/secrets/github-token` (0600). Demo mode uses `createDemoGithubClient`. Cache keys `gh:status` / `gh:issues` / `gh:repos` keep existing TTLs.
