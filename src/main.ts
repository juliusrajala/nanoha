import { generateText } from "./llm/aiSdk";
import { executeLoop } from "./core";
import { getDirectoryContext } from "./config";
import { buildPlanningPrompt, buildSummaryPrompt } from "./prompts";
import { AgentState } from "./state";
import {
  createEditFileTool,
  createListFilesTool,
  createReadFileTool,
  createUpdateStateTool,
} from "./tools";

function destructurePlan(response: string): Array<string> {
  return response
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/^[-*•\d.)\s]+/, "")
        .trim(),
    )
    .filter(Boolean);
}

export async function planSubtasks(prompt: string): Promise<string[]> {
  // Let's just generate these as text since it's about as fast as we can be.
  const result = await generateText({
    system: buildPlanningPrompt(),
    prompt,
  });
  const subtasks = destructurePlan(result.text);

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
        content: `The user's original request was: "${prompt}"\nFinal status: ${status}\nSubtasks completed: ${subtasks.filter((t) => t.completed).length}/${subtasks.length}\n\nUsing the agent message history above, summarize what was done and answer the user's task.`,
      },
    ],
  });

  return result.text;
}

interface Options {
  plan: boolean;
};

export async function runAgent(prompt: string, options: Partial<Options> = {}) {
  const { plan } = options;
  const directoryContext = await getDirectoryContext();

  const subtasks = await planSubtasks(prompt);
  AgentState.create(subtasks);

  const editTools = {
    editFile: createEditFileTool(),
  };

  const readTools = {
    updateState: createUpdateStateTool(),
    readFile: createReadFileTool(),
    listFiles: createListFilesTool(),
  };

  await executeLoop({
    plan: prompt,
    subtasks,
    tools: plan ? readTools : { ...readTools, ...editTools },
    projectContext: directoryContext,
  });

  const summary = await summarize(prompt);
  console.log(`\n[agent] ${summary}`);
  return summary;
}
