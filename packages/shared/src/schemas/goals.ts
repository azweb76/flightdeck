import { z } from "zod";

export const ClarifyOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const ClarifyQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(ClarifyOptionSchema).min(2),
  allowOther: z.boolean().default(true),
  answer: z.string().optional(),
});
export type ClarifyQuestion = z.infer<typeof ClarifyQuestionSchema>;

export const GoalSchema = z.object({
  id: z.number().int().positive(),
  issueId: z.string(),
  originalBody: z.string(),
  markdown: z.string(),
  status: z.enum(["draft", "approved", "written_back"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Goal = z.infer<typeof GoalSchema>;

export const RefineStartSchema = z.object({
  issueId: z.string().min(1),
});

export const RefineAnswerSchema = z.object({
  issueId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string(),
      optionId: z.string().optional(),
      other: z.string().optional(),
    }),
  ),
});

export const GoalPatchSchema = z.object({
  markdown: z.string().min(1),
});

export const RefineQuestionsHandoffSchema = z.object({
  kind: z.literal("refine_questions"),
  questions: z.array(ClarifyQuestionSchema).min(1),
});
export type RefineQuestionsHandoff = z.infer<typeof RefineQuestionsHandoffSchema>;

export const RefineGoalHandoffSchema = z.object({
  kind: z.literal("refine_goal"),
  markdown: z.string().min(1),
});
export type RefineGoalHandoff = z.infer<typeof RefineGoalHandoffSchema>;
