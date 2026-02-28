import { tool } from "ai";
import z from "zod";
import { Glob } from "bun";
import { isExcluded } from "../config";

export function createListFilesTool() {
  return tool({
    description:
      "List files in a directory, including subfolders. Returns file paths matching an optional glob pattern.",
    inputSchema: z.object({
      directory: z.string().describe("The directory path to list files in."),
      pattern: z
        .string()
        .optional()
        .describe('Optional glob pattern to filter files, e.g. "**/*.md" for all markdown files. Defaults to "**/*" (all files recursively).'),
    }),
    execute: async ({ directory, pattern }) => {
      const glob = new Glob(pattern ?? "**/*");
      const files: string[] = [];
      for await (const file of glob.scan({ cwd: directory })) {
        if (!isExcluded(file)) files.push(file);
      }
      return files.join("\n") || "No files found.";
    },
  });
}
