import { tool } from "ai";
import z from "zod";

export function createReadFileTool() {
  return tool({
    description: "Read the current contents of the given file.",
    inputSchema: z.object({
      filePath: z.string().describe("Exact path to file"),
    }),
    execute: async ({ filePath }) => {
      const file = Bun.file(filePath);
      if (!(await file.exists())) return "File does not exist yet.";
      return await file.text();
    },
  });
}
