import {
  RefineGoalHandoffSchema,
  RefineQuestionsHandoffSchema,
  parseAgentJson,
  type ClarifyQuestion,
  type Goal,
} from "@flightdeck/shared";
import { collectAgentOutput } from "../agent/collect.ts";
import { roleModel } from "../runs/execute.ts";
import { refineGoalPrompt, refineQuestionsPrompt } from "../agent/prompts.ts";
import { getIssue } from "../issues/index.ts";
import { insertGoal, latestGoal, updateGoal } from "../goals/store.ts";
import { createGithubClient } from "../github/index.ts";
import { createJiraClient } from "../jira/index.ts";
import { getRepoBySlug } from "../repos/index.ts";
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
  const result = await collectAgentOutput({
    prompt: refineQuestionsPrompt(issue),
    cwd: refineCwd(issue),
    role: "refiner",
    model: roleModel("refiner"),
    permissionMode: "auto",
  });
  const questions = questionsFrom(result);
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
  const result = await collectAgentOutput({
    prompt: refineGoalPrompt(issue, answers, qs),
    cwd: refineCwd(issue),
    role: "refiner",
    model: roleModel("refiner"),
    permissionMode: "auto",
  });
  if (result.status !== "ok") throw new Error(result.error ?? "refiner failed");
  const parsed = parseAgentJson(result.text, (v) => RefineGoalHandoffSchema.parse(v));
  const now = new Date().toISOString();
  const goal = insertGoal({
    issueId,
    originalBody: issue.body,
    markdown: parsed.markdown,
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
  const { isOffline, OfflineError } = await import("../issues/index.ts");
  if (isOffline() && process.env.FLIGHTDECK_DEMO !== "1") throw new OfflineError();
  const goal = latestGoal(issueId);
  if (!goal) throw new Error("No goal draft");
  const next = updateGoal(goal.id, { status: "approved" });
  await writeBack(issueId, next.markdown);
  const written = updateGoal(next.id, { status: "written_back" });
  publish("goals.updated");
  publish("issues.updated");
  return written;
}

function questionsFrom(result: Awaited<ReturnType<typeof collectAgentOutput>>): ClarifyQuestion[] {
  if (result.status === "ask" && result.ask) {
    return [
      {
        id: "ask",
        prompt: result.ask.prompt,
        options: result.ask.options,
        allowOther: true,
      },
    ];
  }
  if (result.status !== "ok") throw new Error(result.error ?? "refiner failed");
  return parseAgentJson(result.text, (v) => RefineQuestionsHandoffSchema.parse(v)).questions;
}

function refineCwd(issue: { repos: { owner: string; name: string; registered: boolean }[] }): string {
  const linked = issue.repos.find((r) => r.registered);
  if (!linked) return process.cwd();
  const repo = getRepoBySlug(`${linked.owner}/${linked.name}`);
  return repo?.localPath || process.cwd();
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
  if (issueId.startsWith("github:")) {
    const rest = issueId.slice("github:".length);
    const [owner, tail] = rest.split("/");
    const num = Number((tail ?? "").split("#")[1]);
    if (owner && tail && num) {
      await createGithubClient().writeIssue(owner, tail.split("#")[0] ?? "", num, markdown);
    }
  }
}
