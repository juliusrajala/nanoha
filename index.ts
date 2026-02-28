import { planSubtasks, runAgent } from "./src/main";

void async function main() {
  const args = Bun.argv.slice(2);
  const hasPlanFlag = args.includes("--plan");
  const prompt = args.filter((arg) => arg !== "--plan").join(" ");
  if (!prompt) {
    console.error("Usage: bun index.ts [--plan] <prompt>");
    process.exit(1);
  }

  if (hasPlanFlag) {
    const subtasks = await planSubtasks(prompt);
    console.log(subtasks.join("\n"));
    return;
  }

  console.log(`Nano Harness starting with prompt: "${prompt}"`);
  await runAgent(prompt);
}();
