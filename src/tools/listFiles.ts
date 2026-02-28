import { tool } from "ai";
import z from "zod";
import { Glob } from "bun";

export function createListFilesTool() {
  return tool({
    description:
      "List files in a directory. Returns file names matching an optional glob pattern.",
    inputSchema: z.object({
      directory: z.string().describe("The directory path to list files in."),
      pattern: z
        .string()
        .optional()
        .describe('Optional glob pattern to filter files, e.g. "*.md". Defaults to "*".'),
    }),
    execute: async ({ directory, pattern }) => {
      const glob = new Glob(pattern ?? "*");
      const files: string[] = [];
      for await (const file of glob.scan({ cwd: directory })) {
        files.push(file);
      }
      return files.join("\n") || "No files found.";
    },
  });
}
