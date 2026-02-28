import { runAgent } from "./src/main";

void async function main() {
  const args = Bun.argv.slice(2);
  console.log("Nano Harness starting with args:", { args });
  await runAgent()
}();
