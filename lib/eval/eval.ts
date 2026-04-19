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
      description: "The evaluation to run (omit for batch mode)",
      type: "string",
      require: false,
    },
  ])
  .run(async ({ args }) => {
    if (!args.evalId) {
      await runAllEvals();
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

async function runAllEvals() {
  const results: Array<{
    id: string;
    passed: boolean;
    judgments: Array<{ statement: string; passed: boolean; raw: string }>;
  }> = [];

  for (const evaluation of evaluations) {
    const session = await createAgentSession();
    const result = await executeEvaluation(session, evaluation.prompt);
    const judgments = await evaluateStatements(evaluation, result);
    const passed = judgments.every((j) => j.judgment);

    results.push({
      id: evaluation.id,
      passed,
      judgments: judgments.map((j) => ({
        statement: j.statement,
        passed: j.judgment,
        raw: j.raw.trim(),
      })),
    });
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  const lines = [
    "",
    "═══════════════════════════════════════════════",
    "  EVALUATION RESULTS",
    "═══════════════════════════════════════════════",
    "",
    `Total: ${total} | Passed: ${passed} | Failed: ${failed}`,
    `Score: ${Math.round((passed / total) * 100)}%`,
    "",
    "───────────────────────────────────────────────",
    "  Per-eval breakdown:",
    "───────────────────────────────────────────────",
    "",
  ];

  for (const result of results) {
    lines.push(`  ${result.passed ? "✅ PASS" : "❌ FAIL"} ${result.id}`);
    for (const judgment of result.judgments) {
      lines.push(`    ${judgment.passed ? "✅" : "❌"} "${judgment.statement}"`);
      if (judgment.raw) {
        lines.push(`       → ${judgment.raw}`);
      }
    }
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════");

  stdout.write(`${lines.join("\n")}\n`);
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
