import { type ModelMessage, stepCountIs, type Tool } from "ai";
import { generateText } from "./llm/aiSdk";
import { AgentState } from "./state";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { logTasks } from "./utils";

interface AgentParams {
  plan: string;
  tools: Record<string, Tool>;
  subtasks: Array<string>;
  projectContext: string;
}

export async function executeLoop(params: AgentParams) {

  console.log(`[agent] Starting plan: ${params.plan}`);
  console.log(`[agent] Subtasks: ${params.subtasks.length}`);


  do {
    const userMessage = buildUserPrompt();
    AgentState.pushHistory([{ role: "user", content: userMessage }])

    const { messages, subtasks } = AgentState.current;
    logTasks(subtasks)

    const result = await generateText({
      system: buildSystemPrompt(params.plan, params.projectContext),
      messages,
      tools: params.tools,
      stopWhen: stepCountIs(5),
    });

    AgentState.pushHistory(result.response.messages);
  } while (AgentState.isInProgress);

  const final = AgentState.current;

  console.log(`[agent] Final status: ${final.status}`);
  console.log(`[agent] Completed: ${final.subtasks.filter((t) => t.completed).length}/${final.subtasks.length}`);

  return final;
}
