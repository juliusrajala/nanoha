import { planSubtasks, runAgent } from "./src/main";
import { startApp} from "./src/tui/root";

void async function main() {
  const args = Bun.argv.slice(2);

  // Start interactive terminal UI
  if (args.length === 0) {
    // return await renderRoot(runAgent)
    return startApp()
  }

  // Run with given flags
  await runWithParams(args)
}();

async function runWithParams(args: string[]) {
  console.log("Running with params")

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
}
