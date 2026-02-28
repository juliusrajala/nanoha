import { AgentState } from "../state";

export function buildSystemPrompt(plan: string): string {
  return `You are a coding agent agent executing a plan provided by the user. Your goal is to complete every subtask.

## Plan
${plan}

## Rules
- Use the updateState tool to mark subtasks as completed by their id.
- You may mark multiple subtasks in a single tool call.
- When all subtasks are done, use updateState to set the state to "completed".
- If you cannot proceed, set the state to "failed" with an explanation.
- Always review the current state before deciding what to do next.`;
}

export function buildPlanningPrompt() {
  return `You are a task planner. Given a user prompt, break it down into a short ordered list of concrete subtasks.

- Return ONLY the subtasks, one per line, no numbering, no bullets, no extra text.`
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
