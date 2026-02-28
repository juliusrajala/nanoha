import { generateText } from "./llm/aiSdk";
import { executeLoop } from "./core";

async function planSubtasks(prompt: string): Promise<string[]> {
  console.log("[planner] Generating subtasks from prompt...");

  const result = await generateText({
    system:
      "You are a task planner. Given a user prompt, break it down into a short ordered list of concrete subtasks. " +
      "Return ONLY the subtasks, one per line, no numbering, no bullets, no extra text.",
    prompt,
  });

  const subtasks = result.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  console.log(`[planner] Generated ${subtasks.length} subtasks:`);
  for (const task of subtasks) {
    console.log(`[planner]   - ${task}`);
  }

  return subtasks;
}

export async function runAgent(prompt: string) {
  const subtasks = await planSubtasks(prompt);

  return executeLoop({
    plan: prompt,
    subtasks,
    tools: [],
  });
}
