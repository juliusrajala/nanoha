import { tool } from "ai";
import z from "zod";
import { AgentState } from "../state";

const updateStateDescription = `Update the status of a subtask or the full state

## Important
- You should only ever ship one full state update at a time but you can mark multiple subtasks as completed at the same time.
- You mark subtasks as completed by providing the id of a specific subtask in the updates array according to the schema.
`;

export function createUpdateStateTool() {
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
          ]),
        )
        .describe(
          "The updates to the agent state you want to ship as an array.",
        ),
    }),
    execute: async ({ updates }) => {
      AgentState.apply(updates);
      return JSON.stringify(AgentState.current);
    },
  });
}
