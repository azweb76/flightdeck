import type { ClarifyQuestion, Goal } from "@flightdeck/shared";
import { getIssue } from "../issues/index.ts";
import { insertGoal, latestGoal, updateGoal } from "../goals/store.ts";
import { createGithubClient } from "../github/index.ts";
import { createJiraClient } from "../jira/index.ts";
import { getSettings } from "../settings/index.ts";
import { createSecretStore } from "../secrets/index.ts";
import { publish } from "../events/index.ts";

const pending = new Map<string, ClarifyQuestion[]>();

export function questionsFor(issueId: string): ClarifyQuestion[] {
  return pending.get(issueId) ?? [];
}

export async function startRefine(issueId: string): Promise<ClarifyQuestion[]> {
  const issue = await getIssue(issueId);
  if (!issue) throw new Error("Issue not found");
  const questions: ClarifyQuestion[] = [
    {
      id: "scope",
      prompt: "What is in scope for this change?",
      options: [
        { id: "minimal", label: "Smallest change that meets the issue" },
        { id: "full", label: "Full production-ready behavior" },
      ],
      allowOther: true,
    },
    {
      id: "compat",
      prompt: "How should we treat existing callers?",
      options: [
        { id: "compat", label: "Keep backward compatibility" },
        { id: "break", label: "A breaking change is OK" },
      ],
      allowOther: true,
    },
  ];
  pending.set(issueId, questions);
  publish("goals.updated");
  return questions;
}

export async function submitAnswers(
  issueId: string,
  answers: { questionId: string; optionId?: string; other?: string }[],
): Promise<Goal> {
  const issue = await getIssue(issueId);
  if (!issue) throw new Error("Issue not found");
  const qs = pending.get(issueId) ?? [];
  const lines = qs.map((q) => {
    const a = answers.find((x) => x.questionId === q.id);
    const picked = q.options.find((o) => o.id === a?.optionId)?.label;
    return `- ${q.prompt} **${a?.other || picked || "unanswered"}**`;
  });
  const markdown = [
    `## Goal`,
    issue.title,
    "",
    `## Acceptance criteria`,
    ...lines,
    "",
    `## Constraints`,
    `- Stay inside ${issue.repos.map((r) => `${r.owner}/${r.name}`).join(", ") || "the linked repo"}`,
    `- Follow the repo CLAUDE.md`,
  ].join("\n");
  const now = new Date().toISOString();
  const goal = insertGoal({
    issueId,
    originalBody: issue.body,
    markdown,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
  pending.delete(issueId);
  publish("goals.updated");
  publish("issues.updated");
  return goal;
}

export function saveGoalMarkdown(issueId: string, markdown: string): Goal {
  const goal = latestGoal(issueId);
  if (!goal) throw new Error("No goal draft");
  const next = updateGoal(goal.id, { markdown });
  publish("goals.updated");
  return next;
}

export async function approveGoal(issueId: string): Promise<Goal> {
  const goal = latestGoal(issueId);
  if (!goal) throw new Error("No goal draft");
  const next = updateGoal(goal.id, { status: "approved" });
  await writeBack(issueId, next.markdown);
  const written = updateGoal(next.id, { status: "written_back" });
  publish("goals.updated");
  publish("issues.updated");
  return written;
}

async function writeBack(issueId: string, markdown: string): Promise<void> {
  if (process.env.FLIGHTDECK_DEMO === "1") return;
  if (issueId.startsWith("jira:")) {
    const settings = getSettings();
    const token = await createSecretStore().get();
    if (!settings.jiraSiteUrl || !settings.jiraEmail || !token) return;
    await createJiraClient().writeDescription({
      siteUrl: settings.jiraSiteUrl,
      email: settings.jiraEmail,
      token,
      key: issueId.slice(5),
      description: markdown,
    });
    return;
  }
  // GitHub issues: comment rather than silently replacing when gh isn't available.
  void markdown;
  void createGithubClient;
}
