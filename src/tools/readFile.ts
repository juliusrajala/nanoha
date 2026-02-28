import { tool } from "ai";
import z from "zod";
import { isExcluded } from "../config";

export function createReadFileTool() {
  return tool({
    description: "Read the current contents of the given file.",
    inputSchema: z.object({
      filePath: z.string().describe("Exact path to file"),
    }),
    execute: async ({ filePath }) => {
      if (isExcluded(filePath)) return "Error: access to this file is restricted.";
      const file = Bun.file(filePath);
      if (!(await file.exists())) return "File does not exist.";
      return await file.text();
    },
  });
}
