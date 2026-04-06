import { expect, setDefaultTimeout, test } from "bun:test";
import { evaluateStatements } from "./judge";
import type { Evaluation, EvalRunResult } from "../eval";

setDefaultTimeout(60000);

const judgeCases: Array<{
  id: string;
  statement: string;
  result: EvalRunResult;
  expected: boolean;
}> = [
  {
    id: "readme-development-pass",
    statement: "The README.md contains a Development section.",
    result: {
      output: "Yes, README.md has a Development section.",
      toolCalls: ["readFile"],
    },
    expected: true,
  },
  {
    id: "readme-development-fail",
    statement: "The README.md does not mention development.",
    result: {
      output: "Yes, README.md has a Development section.",
      toolCalls: ["readFile"],
    },
    expected: false,
  },
  {
    id: "wrong-file-fail",
    statement: "The LICENSE file contains development instructions.",
    result: {
      output: "The development instructions are in README.md.",
      toolCalls: ["readFile"],
    },
    expected: false,
  },
  {
    id: "tui-launch-pass",
    statement: "Running the app without a prompt opens the TUI.",
    result: {
      output: "Running bun run index.ts without a prompt opens the TUI.",
      toolCalls: ["readFile"],
    },
    expected: true,
  },
  {
    id: "vitest-fail",
    statement: "The project uses Vitest for tests.",
    result: {
      output: "The project uses Bun and Bun test.",
      toolCalls: ["readFile"],
    },
    expected: false,
  },
  {
    id: "paraphrase-pass",
    statement: "The README tells you how to run the app locally with a prompt.",
    result: {
      output: "README.md explains how to start the app by passing a prompt to bun run index.ts.",
      toolCalls: ["readFile"],
    },
    expected: true,
  },
  {
    id: "unsupported-claim-fail",
    statement: "The README describes how to deploy the project to Kubernetes.",
    result: {
      output: "The README only covers development setup and running the app locally.",
      toolCalls: ["readFile"],
    },
    expected: false,
  },
  {
    id: "tool-output-pass",
    statement: "The assistant concluded that README.md has a Prompt development subsection.",
    result: {
      output:
        "Yes. README.md includes a Prompt development subsection describing src/agent/prompts.ts.",
      toolCalls: ["readFile"],
    },
    expected: true,
  },
  {
    id: "contradiction-fail",
    statement: "The assistant said there is no Development section in README.md.",
    result: {
      output: "README.md clearly has a Development section.",
      toolCalls: ["readFile"],
    },
    expected: false,
  },
  {
    id: "multi-tool-pass",
    statement: "The assistant used readFile to answer the README question.",
    result: {
      output: "I checked README.md and confirmed it has a Development section.",
      toolCalls: ["listFiles", "readFile"],
    },
    expected: true,
  },
];

test(
  "judge benchmark on 10 labeled cases",
  async () => {
    expect(process.env.OPENAI_API_KEY).toBeTruthy();

    const results = await Promise.all(
      judgeCases.map(async (judgeCase) => {
        const evaluation: Evaluation = {
          id: judgeCase.id,
          prompt: judgeCase.id,
          statements: [judgeCase.statement],
          _description: judgeCase.id,
        };

        const [judgment] = await evaluateStatements(evaluation, judgeCase.result);
        return {
          id: judgeCase.id,
          expected: judgeCase.expected,
          actual: judgment?.judgment ?? false,
          raw: judgment?.raw.trim() || "<empty>",
        };
      }),
    );

    const correct = results.filter((result) => result.expected === result.actual).length;
    const accuracy = correct / results.length;
    const summary = `Judge score: ${correct}/${results.length} (${Math.round(accuracy * 100)}%)`;

    console.info(summary);
    for (const result of results) {
      console.info(
        `${result.id}: expected=${result.expected ? "PASS" : "FAIL"} actual=${result.actual ? "PASS" : "FAIL"} raw=${result.raw}`,
      );
    }

    expect(results).toHaveLength(10);
    expect(accuracy).toBeGreaterThanOrEqual(0.8);
  },
  { timeout: 60000 },
);
