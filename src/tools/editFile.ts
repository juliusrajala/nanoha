import { tool } from "ai";
import z from "zod";

export function createEditFileTool() {
  return tool({
    description:
      "Make a targeted edit to the given file by replacing the first occurrence of oldText with newText.",
    inputSchema: z.object({
      filePath: z.string().describe("The exact path to the file to edit"),
      oldText: z.string().describe("The exact text to find in the file."),
      newText: z.string().describe("The text to replace it with."),
    }),
    execute: async ({ filePath, oldText, newText }) => {
      const file = Bun.file(filePath);

      if (!(await file.exists())) return "Error: file does not exist.";

      const content = await file.text();
      if (!content.includes(oldText)) {
        return `Error: could not find "${oldText}" in the file.`;
      }

      await Bun.write(filePath, content.replace(oldText, newText));
      return await Bun.file(filePath).text();
    },
  });
}
