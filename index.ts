import { runAgent } from "./src/main";

void async function main() {
  const prompt = Bun.argv.slice(2).join(" ");
  if (!prompt) {
    console.error("Usage: bun index.ts <prompt>");
    process.exit(1);
  }
  console.log(`Nano Harness starting with prompt: "${prompt}"`);
  await runAgent(prompt);
}();
