import type { ModelMessage } from "ai";
import z from "zod";

export interface Subtask {
  id: string;
  label: string;
  index: number;
  completed: boolean;
}

const stateStatusSchema = z.enum([
  "draft",
  "in-progress",
  "failed",
  "completed",
  "needs-input",
]);
type StateStatus = z.infer<typeof stateStatusSchema>

export interface State {
  status: StateStatus;
  subtasks: Array<Subtask>;
  messages: Array<ModelMessage>;
}

const statusUpdate = z.object({
  type: z.literal("state"),
  to: stateStatusSchema,
});

const subtaskUpdate = z.object({
  type: z.literal("subtask"),
  id: z.string(),
});

const StateUpdateSchema = z.union([statusUpdate, subtaskUpdate]);
type StateUpdate = z.infer<typeof StateUpdateSchema>;

export class AgentState implements State {
  private static instance: AgentState | null = null;

  status: StateStatus;
  subtasks: Array<Subtask>;
  messages: ModelMessage[] = [];

  private constructor(state: State) {
    this.status = state.status;
    this.subtasks = state.subtasks;
  }

  static create(subtasks: Array<string>): void {
    AgentState.instance = new AgentState({
      status: "in-progress",
      subtasks: subtasks.map((label, i) => ({
        id: i.toString(),
        index: i,
        label,
        completed: false,
      })),
      messages: []
    });
  }

  private static get self(): AgentState {
    if (!AgentState.instance) {
      throw new Error(
        "AgentState not initialized. Call AgentState.create() first.",
      );
    }
    return AgentState.instance;
  }

  static get current(): Readonly<State & { messages: ModelMessage[] }> {
    return {
      status: AgentState.self.status,
      subtasks: AgentState.self.subtasks,
      messages: AgentState.self.messages,
    };
  }

  static get isInProgress(): boolean {
    const { status, subtasks } = AgentState.self;
    if (subtasks.every((t) => t.completed)) {
      return false;
    }
    return status === "in-progress";
  }

  static pushHistory(newMessages: Array<ModelMessage>) {
    const self = AgentState.self;
    self.messages.push(...newMessages);
  }

  static apply(updates: Array<StateUpdate>): void {
    const self = AgentState.self;
    for (const update of updates) {
      switch (update.type) {
        case "state":
          self.status = update.to;
          break;
        case "subtask": {
          const subtask = self.subtasks.find((t) => t.id === update.id);
          if (subtask) {
            subtask.completed = true;
          }
          break;
        }
      }
    }
  }
}
