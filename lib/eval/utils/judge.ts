import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { EvalRunResult, Evaluation } from "../eval";

export async function evaluateStatements(evaluation: Evaluation, result: EvalRunResult) {
  return await Promise.all(
    evaluation.statements.map(async (statement) => {
      const judgment = await judgeStatement(statement, result);
      return { statement, judgment: isPassVerdict(judgment), raw: judgment };
    }),
  );
}

export async function judgeStatement(statement: string, result: EvalRunResult) {
  const { output } = await generateText({
    model: openai("gpt-5.4-mini"),
    prompt: buildJudgePrompt(statement, result),
  });

  return output;
}

export function isPassVerdict(output: string): boolean {
  return output.trim().toUpperCase() === "PASS";
}

export function buildJudgePrompt(statement: string, result: EvalRunResult) {
  const prompt = `
You are a helpful and precise assistant for checking the correctness of the following statement:
- ${statement}

The assistant's output looked like the following:
<output>
${JSON.stringify(result, null, 2)}
</output>

Is the given statement factual?

Rules:
- Answer only with PASS or FAIL
- Never include reasoning, only PASS or FAIL
`;

  return prompt;
}
