import { tool } from "ai";
import z from "zod";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { isExcluded } from "../config";

export function createFileTool() {
  return tool({
    description:
      "Create a file with the provided content. Creates missing parent directories. Returns an error if the file already exists unless overwrite is true.",
    inputSchema: z.object({
      filePath: z.string().describe("Exact path to the file to create."),
      content: z.string().describe("Full file content to write."),
      overwrite: z.boolean().optional().describe("Set to true to overwrite an existing file."),
    }),
    execute: async ({ filePath, content, overwrite }) => {
      if (isExcluded(filePath)) return "Error: access to this file is restricted.";

      const file = Bun.file(filePath);
      const exists = await file.exists();

      if (exists && !overwrite) {
        return "Error: file already exists. Set overwrite to true to replace it.";
      }

      await mkdir(dirname(filePath), { recursive: true });
      await Bun.write(filePath, content);

      return `File ${exists ? "updated" : "created"}: ${filePath}`;
    },
  });
}
