export const APP_NAME = "Flightdeck";
export const APP_SLUG = "flightdeck";
export const APP_BUNDLE_ID = "dev.flightdeck.app";
export const APP_DATA_DIR_NAME = `.${APP_SLUG}`;
export const KEYCHAIN_SERVICE = "flightdeck";
export const DEFAULT_PORT = 47321;
export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_LABEL_PREFIX = "gh:";
export const DEFAULT_JIRA_JQL =
  "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC";
export const DEFAULT_THEME = "system" as const;
export const JIRA_TOKEN_ACCOUNT = "jira-api-token";
