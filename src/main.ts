import { generateText } from "./llm/aiSdk";
import { executeLoop } from "./core";
import { getFileTree } from "./config";
import { buildPlanningPrompt, buildSummaryPrompt } from "./prompts";
import { AgentState } from "./state";
import { createEditFileTool, createListFilesTool, createReadFileTool, createUpdateStateTool } from "./tools";

function destructurePlan(response: string): Array<string> {
  return response
    .split("\n")
    .map((line) => line.trim().replace(/^[-*•\d.)\s]+/, "").trim())
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

async function summarize(prompt: string): Promise<string> {
  const { status, subtasks, messages } = AgentState.current;

  const result = await generateText({
    system: buildSummaryPrompt(),
    messages: [
      ...messages,
      {
        role: "user",
        content: `The user's original request was: "${prompt}"\nFinal status: ${status}\nSubtasks completed: ${subtasks.filter((t) => t.completed).length}/${subtasks.length}\n\nSummarize what was done.`,
      },
    ],
  });

  return result.text;
}

export async function runAgent(prompt: string) {
  const cwd = process.cwd();
  const fileTree = await getFileTree(cwd);
  const projectContext = `## Environment\nWorking directory: ${cwd}\n\n## Project files\n${fileTree}`;

  const subtasks = await planSubtasks(prompt);
  AgentState.create(subtasks);

  const tools = {
    updateState: createUpdateStateTool(),
    readFile: createReadFileTool(),
    editFile: createEditFileTool(),
    listFiles: createListFilesTool(),
  };

  await executeLoop({
    plan: prompt,
    subtasks,
    tools,
    projectContext,
  });

  const summary = await summarize(prompt);
  console.log(`\n[agent] ${summary}`);
  return summary;
}
