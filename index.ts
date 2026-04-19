import { Crust } from "@crustjs/core";
import { createAgentSession, type CommandApprovalHandler } from "./src/main";
import { renderRoot } from "./src/tui/root";
import { stderr, stdout } from "bun";
import { createInterface } from "node:readline/promises";

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
    {
      name: "yolo",
      description: "Skip command approval prompts for runCommand",
      type: "boolean",
      require: false,
    },
  ])
  .run(async ({ args }) => {
    const yolo = Boolean(args.yolo);

    if (!args.prompt) {
      const session = await createAgentSession({ yolo });
      await renderRoot(session);
      return;
    }

    const prompt = args.prompt.toString();
    const verbose = Boolean(args.verbose);
    const session = await createAgentSession({ yolo });
    if (!yolo) {
      session.setCommandApprovalHandler(requestCliApproval);
    }

    await session.run({
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
          case "tool-approval-request":
            if (verbose) {
              stdout.write(
                `[tool approval] ${update.toolCall.toolName} ${preview(update.toolCall.input)}\n`,
              );
            } else {
              stdout.write(`[tool approval] ${update.toolCall.toolName}\n`);
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

const requestCliApproval: CommandApprovalHandler = async (request) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(
      `\nAllow command execution?\n${request.toolName} ${preview(request.input)}\n[y/N]: `,
    );
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
};
