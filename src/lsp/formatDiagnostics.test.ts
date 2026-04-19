import { expect, test } from "bun:test";
import { formatDiagnosticsOutput, type LspDiagnostic } from "./formatDiagnostics";

const sampleDiagnostic: LspDiagnostic = {
  range: {
    start: { line: 4, character: 2 },
    end: { line: 4, character: 10 },
  },
  severity: 1,
  code: "TS2304",
  source: "ts",
  message: "Cannot find name 'foo'.",
};

test("formatDiagnosticsOutput formats diagnostic entries", () => {
  const output = formatDiagnosticsOutput(`${process.cwd()}/src/main.ts`, [sampleDiagnostic], 10);
  expect(output).toContain("src/main.ts:5:3 error TS2304 Cannot find name 'foo'. [ts]");
});

test("formatDiagnosticsOutput handles empty diagnostics", () => {
  const output = formatDiagnosticsOutput(`${process.cwd()}/src/main.ts`, [], 10);
  expect(output).toBe("No diagnostics in src/main.ts.");
});

test("formatDiagnosticsOutput caps output length", () => {
  const output = formatDiagnosticsOutput(
    `${process.cwd()}/src/main.ts`,
    [sampleDiagnostic, sampleDiagnostic],
    1,
  );
  expect(output).toContain("... 1 more diagnostics omitted.");
});
