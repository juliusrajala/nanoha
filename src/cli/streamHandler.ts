import type { TextStreamPart } from "ai";
import { stderr, stdout } from "bun";
import { createInterface } from "node:readline/promises";
import type { CommandApprovalRequest, RunOptions } from "src/types";

function preview(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 160 ? `${compact.slice(0, 159)}...` : compact;
}

export function subscribeCli(options: RunOptions) {
  const { verbose } = options;
  return (update: TextStreamPart<any>) => {
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
  };
}

export async function requestCliApproval(request: CommandApprovalRequest): Promise<boolean> {
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
}
