import { Crust } from "@crustjs/core";
import { createAgentSession, runAgent } from "./src/main";
import { renderRoot } from "./src/tui/root";
import { stderr, stdout } from "bun";

const main = new Crust("nanoha")
  .meta({ description: "Nanoha Agent Harness" })
  .args([
    {
      name: "prompt",
      description: "The prompt to run the Nanoha agent with",
      type: "string",
      require: false,
    },
    {
      name: "verbose",
      description: "Print full tool inputs and outputs",
      type: "boolean",
      require: false,
    },
  ])
  .run(async ({ args }) => {
    if (!args.prompt) {
      const session = await createAgentSession();
      await renderRoot(session);
      return;
    }

    const prompt = args.prompt.toString();
    const verbose = Boolean(args.verbose);
    await runAgent({
      prompt,
      handler: (update) => {
        switch (update.type) {
          case "text-delta":
            stdout.write(update.text);
            break;
          case "text-end":
            stdout.write("\n");
            break;
          case "tool-call":
            if (verbose) {
              stdout.write(`[tool call] ${update.toolName} ${preview(update.input)}\n`);
            } else {
              stdout.write(`[tool] ${update.toolName}\n`);
            }
            break;
          case "tool-result":
            if (verbose) {
              stdout.write(`[tool result] ${update.toolName} ${preview(update.output)}\n`);
            } else {
              stdout.write(`[tool done] ${update.toolName}\n`);
            }
            break;
          case "tool-error":
          case "error":
            stderr.write(`[error] ${preview(update.error)}\n`);
            break;
          default:
            break;
        }
      },
    });
  });

await main.execute();

function preview(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 160 ? `${compact.slice(0, 159)}...` : compact;
}
