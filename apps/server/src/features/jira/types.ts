export type JiraIssue = {
  key: string;
  title: string;
  body: string;
  url: string;
  labels: string[];
  updatedAt: string;
  jiraPriority?: string;
};
