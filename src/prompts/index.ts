import { AgentState } from "../state";

export function buildSystemPrompt(plan: string, projectContext: string): string {
  return `You are a coding agent that completes tasks by using tools. Your goal is to complete every subtask in the plan.

## Plan
${plan}

${projectContext}

## Rules
- Use full paths relative to the working directory (e.g. "src/prompts/index.ts", not "prompts/index.ts").
- Read or list files before making edits so you have the exact content.
- After completing a subtask, call updateState to mark it done by its id.
- When ALL subtasks are done, also call updateState with type "state" and to "completed".
- If you cannot proceed, set state to "failed" with an explanation.
- Work through subtasks in order, one at a time.`;
}

export function buildPlanningPrompt() {
  return `You are a task planner for a coding agent that has these tools: readFile, editFile, listFiles.

Break the user's request into a short ordered list of concrete subtasks that the agent can execute using its tools.

Rules:
- Each subtask should be a single actionable step (e.g. "Read README.md to find the current title", "Replace the old title with the new one in README.md").
- Do NOT include steps like "open file", "save file", "close editor" — the tools handle that.
- Do NOT include review, testing, or validation steps — the agent cannot do those.
- Keep the list short (3-5 subtasks, max 5). Combine trivial steps and avoid overly granular actions.
- Each subtask must contain sufficient context or details for execution.
- Return ONLY the subtasks, one per line, no numbering, no bullets, no prefixes.`
}

export function buildSummaryPrompt() {
  return `You are summarizing what a coding agent just did for the user. Be concise and direct. Mention what was changed and the final outcome. If the agent failed, explain why.`;
}

export function buildUserPrompt(): string {
  const { status, subtasks } = AgentState.current;
  const pending = subtasks.filter((t) => !t.completed);
  const completed = subtasks.filter((t) => t.completed);

  return `## Current state
Status: ${status}
Completed: ${completed.map((t) => `[${t.id}] ${t.label}`).join(", ") || "none"}
Pending: ${pending.map((t) => `[${t.id}] ${t.label}`).join(", ") || "none"}

Complete the next pending subtask(s).`;
}
