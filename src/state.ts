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

type StateUpdate =
  | { type: "state"; to: "failed" | "completed" | "needs-input" }
  | { type: "subtask"; id: string };

export class AgentState {
  private state: State;

  private constructor(state: State) {
    this.state = state;
  }

  static create(subtasks: Array<string>): AgentState {
    return new AgentState({
      status: "in-progress",
      subtasks: subtasks.map((label, i) => ({
        id: i.toString(),
        index: i,
        label,
        completed: false,
      })),
    });
  }

  get current(): Readonly<State> {
    return this.state;
  }

  get isInProgress(): boolean {
    if (this.state.subtasks.every((t) => t.completed)) {
      return false;
    }
    return this.state.status === "in-progress";
  }

  apply(updates: Array<StateUpdate>): void {
    for (const update of updates) {
      switch (update.type) {
        case "state":
          this.state = { ...this.state, status: update.to };
          break;
        case "subtask": {
          const subtask = this.state.subtasks.find((t) => t.id === update.id);
          if (subtask) {
            subtask.completed = true;
          }
          break;
        }
      }
    }
  }
}
