import type { ModelMessage } from "ai";
import z from "zod";

export interface Subtask {
  id: string;
  label: string;
  index: number;
  completed: boolean;
}

export interface State {
  status: "draft" | "in-progress" | "needs-input" | "completed" | "failed";
  subtasks: Array<Subtask>;
}

export const StateUpdateSchema = z.union([
  z.object({ type: z.literal('state'), to: z.enum(['failed', 'completed', 'needs-input', 'in-progress']) }),
  z.object({ type: z.literal('subtask'), id: z.string() })
])

type StateUpdate =
  | { type: "state"; to: "failed" | "completed" | "needs-input" | "in-progress" }
  | { type: "subtask"; id: string };

export class AgentState {
  private static instance: AgentState | null = null;
  private state: State;

  protected messages: ModelMessage[] = []

  private constructor(state: State) {
    this.state = state;
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
    });
  }

  private static get self(): AgentState {
    if (!AgentState.instance) {
      throw new Error("AgentState not initialized. Call AgentState.create() first.");
    }
    return AgentState.instance;
  }

  static get current(): Readonly<State & { messages: ModelMessage[] }> {
    return {... AgentState.self.state, messages: AgentState.self.messages};
  }

  static get isInProgress(): boolean {
    const { state } = AgentState.self;
    if (state.subtasks.every((t) => t.completed)) {
      return false;
    }
    return state.status === "in-progress";
  }

  static pushHistory(newMessages: Array<ModelMessage>) {
    const self = AgentState.self;
    self.messages.push(...newMessages)
  }

  static apply(updates: Array<StateUpdate>): void {
    const self = AgentState.self;
    for (const update of updates) {
      switch (update.type) {
        case "state":
          self.state = { ...self.state, status: update.to };
          break;
        case "subtask": {
          const subtask = self.state.subtasks.find((t) => t.id === update.id);
          if (subtask) {
            subtask.completed = true;
          }
          break;
        }
      }
    }
  }
}
