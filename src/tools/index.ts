import { tool } from "ai";
import z from "zod";
import type { AgentState } from "../state";

const PLAYGROUND_PATH = "./playground.md";

export function createReadFileTool() {
  return tool({
    description: "Read the current contents of playground.md.",
    inputSchema: z.object({}),
    execute: async () => {
      const file = Bun.file(PLAYGROUND_PATH);
      if (!(await file.exists())) return "File does not exist yet.";
      return await file.text();
    },
  });
}

export function createEditFileTool() {
  return tool({
    description:
      "Make a targeted edit to playground.md by replacing the first occurrence of oldText with newText.",
    inputSchema: z.object({
      oldText: z.string().describe("The exact text to find in the file."),
      newText: z.string().describe("The text to replace it with."),
    }),
    execute: async ({ oldText, newText }) => {
      const file = Bun.file(PLAYGROUND_PATH);
      if (!(await file.exists())) return "Error: file does not exist.";
      const content = await file.text();
      if (!content.includes(oldText))
        return `Error: could not find "${oldText}" in the file.`;
      await Bun.write(PLAYGROUND_PATH, content.replace(oldText, newText));
      return await Bun.file(PLAYGROUND_PATH).text();
    },
  });
}

const updateStateDescription = `Update the status of a subtask or the full state

## Important
- You should only ever ship one full state update at a time but you can mark multiple subtasks as completed at the same time.
- You mark subtasks as completed by providing the id of a specific subtask in the updates array according to the schema.
`;

export function createUpdateStateTool(agentState: AgentState) {
  return tool({
    description: updateStateDescription,
    inputSchema: z.object({
      updates: z
        .array(
          z.union([
            z.object({
              type: z.literal("state"),
              to: z.enum(["failed", "completed", "needs-input"]),
            }),
            z.object({
              type: z.literal("subtask"),
              id: z.string(),
            }),
          ])
        )
        .describe(
          "The updates to the agent state you want to ship as an array."
        ),
    }),
    execute: async ({ updates }) => {
      agentState.apply(updates);
      return JSON.stringify(agentState.current);
    },
  });
}
