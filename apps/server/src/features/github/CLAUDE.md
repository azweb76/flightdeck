# github

Octokit (`@octokit/rest` + throttle + retry) for GitHub API. git CLI stays for clone/fetch/worktree/commit/push, authenticated via `GIT_ASKPASS` (`askpass.mjs`) — never a token in remote URLs or `.git/config`. Token lives in the keychain (`@napi-rs/keyring`) or `~/.flightdeck/secrets/github-token` (0600). Demo mode uses `createDemoGithubClient`. Cache keys `gh:status` / `gh:issues` / `gh:repos` keep existing TTLs.
