import { generateText } from "./llm/aiSdk";
import { executeLoop } from "./core";
import { buildPlanningPrompt } from "./prompts";
import { AgentState } from "./state";
import { createEditFileTool, createListFilesTool, createReadFileTool, createUpdateStateTool } from "./tools";

function destructurePlan(response: string): Array<string> {
  return response
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function planSubtasks(prompt: string): Promise<string[]> {
  // Let's just generate these as text since it's about as fast as we can be.
  const result = await generateText({
    system: buildPlanningPrompt(),
    prompt,
  });
  const subtasks = destructurePlan(result.text)

  return subtasks;
}

export async function runAgent(prompt: string) {
  const subtasks = await planSubtasks(prompt);
  AgentState.create(subtasks);

  const tools = {
    updateState: createUpdateStateTool(),
    readFile: createReadFileTool(),
    editFile: createEditFileTool(),
    listFiles: createListFilesTool(),
  };

  return executeLoop({
    plan: prompt,
    subtasks,
    tools,
  });
}
