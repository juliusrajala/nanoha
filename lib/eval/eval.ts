import { Crust } from "@crustjs/core";
import { stderr, stdout } from "bun";
import type { TextStreamPart } from "ai";
import proofs from "./proofs.json";
import { evaluateStatements } from "./utils/judge";
import { createAgentSession } from "../../src/main";

const evaluations = proofs as Evaluation[];

export interface Evaluation {
  id: string;
  prompt: string;
  statements: string[];
  toolUse?: Record<string, number>;
  _description: string;
}

export interface EvalRunResult {
  output: string;
  toolCalls: string[];
}

const main = new Crust("eval")
  .meta({ description: "Run the evaluation" })
  .args([
    {
      name: "evalId",
      description: "The evaluation to run",
      type: "string",
      require: false,
    },
  ])
  .run(async ({ args }) => {
    if (!args.evalId) {
      printUsage();
      return;
    }

    const evaluation = evaluations.find((entry) => entry.id === args.evalId);
    if (!evaluation) {
      stderr.write(`Evaluation with id ${args.evalId} not found\n`);
      printUsage();
      return;
    }

    await runEvaluation(evaluation);
  });

async function runEvaluation(evaluation: Evaluation) {
  const session = await createAgentSession();
  const result = await executeEvaluation(session, evaluation.prompt);
  const judgments = await evaluateStatements(evaluation, result);
  const passed = judgments.every((judgment) => judgment.judgment);

  const lines = [
    `${passed ? "PASS" : "FAIL"}: ${evaluation.id}`,
    `Prompt: ${evaluation.prompt}`,
    `Description: ${evaluation._description}`,
    "",
    "Output:",
    indentBlock(result.output || "<no assistant output>"),
    "",
    "Tool calls:",
    ...(result.toolCalls.length === 0
      ? ["  <none>"]
      : result.toolCalls.map((toolName) => `  - ${toolName}`)),
    "",
    "Judge:",
    ...judgments.map(
      (judgment) =>
        `  - [${judgment.judgment ? "PASS" : "FAIL"}] ${judgment.statement} (${judgment.raw.trim() || "<empty>"})`,
    ),
  ];

  stdout.write(`${lines.join("\n")}\n`);
}

async function executeEvaluation(
  session: Awaited<ReturnType<typeof createAgentSession>>,
  prompt: string,
): Promise<EvalRunResult> {
  let output = "";
  const toolCalls: string[] = [];

  await session.run({
    prompt,
    handler: (part: TextStreamPart<any>) => {
      switch (part.type) {
        case "text-delta":
          output += part.text;
          break;
        case "tool-call":
          toolCalls.push(part.toolName);
          break;
        default:
          break;
      }
    },
  });

  return {
    output: output.trim(),
    toolCalls,
  };
}

function indentBlock(value: string): string {
  return value
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

function printUsage() {
  const lines = ["Usage: bun run ./lib/eval/eval.ts <evaluation-id>", "Available evaluations:"];
  for (const evaluation of evaluations) {
    lines.push(`  - ${evaluation.id}: ${evaluation._description}`);
  }
  stdout.write(`${lines.join("\n")}\n`);
}

await main.execute();
