import { tool } from "ai";
import z from "zod";

const DEFAULT_TIMEOUT_MS = 120000;
const MAX_OUTPUT_CHARS = 12000;

interface RunCommandToolOptions {
  yolo: boolean;
}

export function createRunCommandTool(options: RunCommandToolOptions) {
  return tool({
    description:
      "Run a shell command in the project root. Requests human approval first unless YOLO mode is enabled.",
    needsApproval: !options.yolo,
    inputSchema: z.object({
      command: z.string().describe("Shell command to execute."),
      timeoutMs: z
        .number()
        .int()
        .positive()
        .max(600000)
        .optional()
        .describe("Optional timeout in milliseconds (default 120000)."),
    }),
    execute: async ({ command, timeoutMs }) => {
      const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const processHandle = Bun.spawn(["bash", "-lc", command], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdoutPromise = new Response(processHandle.stdout).text();
      const stderrPromise = new Response(processHandle.stderr).text();

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        processHandle.kill();
      }, timeout);

      const exitCode = await processHandle.exited;
      clearTimeout(timer);

      const stdout = truncateOutput(await stdoutPromise);
      const stderr = truncateOutput(await stderrPromise);

      if (timedOut) {
        return [
          `Command timed out after ${timeout}ms.`,
          `Command: ${command}`,
          stdout ? `STDOUT:\n${stdout}` : "",
          stderr ? `STDERR:\n${stderr}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");
      }

      return [
        `Command exited with code ${exitCode}.`,
        `Command: ${command}`,
        stdout ? `STDOUT:\n${stdout}` : "",
        stderr ? `STDERR:\n${stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    },
  });
}

function truncateOutput(output: string): string {
  if (output.length <= MAX_OUTPUT_CHARS) return output;
  return `${output.slice(0, MAX_OUTPUT_CHARS)}\n... output truncated ...`;
}
