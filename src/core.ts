import { type ModelMessage, stepCountIs } from "ai";
import { generateText } from "./llm/aiSdk";
import { AgentState } from "./state";
import {
  createUpdateStateTool,
  createEditFileTool,
  createReadFileTool,
  createListFilesTool,
} from "./tools";

interface AgentParams {
  plan: string;
  tools: string[];
  subtasks: Array<string>;
}

function buildSystemPrompt(plan: string): string {
  return `You are an agent executing a plan. Your goal is to complete every subtask.

## Plan
${plan}

## Rules
- Use the updateState tool to mark subtasks as completed by their id.
- You may mark multiple subtasks in a single tool call.
- When all subtasks are done, use updateState to set the state to "completed".
- If you cannot proceed, set the state to "failed" with an explanation.
- Always review the current state before deciding what to do next.`;
}

function buildUserPrompt(agentState: AgentState): string {
  const { status, subtasks } = agentState.current;
  const pending = subtasks.filter((t) => !t.completed);
  const completed = subtasks.filter((t) => t.completed);

  return `## Current state
Status: ${status}
Completed: ${completed.map((t) => `[${t.id}] ${t.label}`).join(", ") || "none"}
Pending: ${pending.map((t) => `[${t.id}] ${t.label}`).join(", ") || "none"}

Complete the next pending subtask(s).`;
}

export async function executeLoop(params: AgentParams) {
  const agentState = AgentState.create(params.subtasks);
  const tools = {
    updateState: createUpdateStateTool(agentState),
    readFile: createReadFileTool(),
    editFile: createEditFileTool(),
    listFiles: createListFilesTool(),
  };
  const messages: Array<ModelMessage> = [];
  let iteration = 0;

  console.log(`[agent] Starting plan: ${params.plan}`);
  console.log(`[agent] Subtasks: ${params.subtasks.length}`);

  do {
    iteration++;
    const { status, subtasks } = agentState.current;
    const done = subtasks.filter((t) => t.completed).length;
    console.log(`\n[agent] --- Iteration ${iteration} ---`);
    console.log(`[agent] Status: ${status} | Progress: ${done}/${subtasks.length}`);

    const userMessage = buildUserPrompt(agentState);
    messages.push({ role: "user", content: userMessage });

    const result = await generateText({
      system: buildSystemPrompt(params.plan),
      messages,
      tools,
      stopWhen: stepCountIs(5),
    });

    for (const step of result.steps) {
      if (step.text) {
        console.log(`[agent] LLM: ${step.text}`);
      }
      for (const call of step.toolCalls) {
        console.log(`[agent] Tool call: ${call.toolName}(${JSON.stringify(call.input)})`);
      }
      for (const toolResult of step.toolResults) {
        console.log(`[agent] Tool result: ${toolResult.output}`);
      }
    }

    messages.push(...result.response.messages);
  } while (agentState.isInProgress);

  const final = agentState.current;
  console.log(`\n[agent] === Done ===`);
  console.log(`[agent] Final status: ${final.status}`);
  console.log(`[agent] Completed: ${final.subtasks.filter((t) => t.completed).length}/${final.subtasks.length}`);

  return final;
}
