interface Subtask {
  id: string;
  label: string;
  index: number;
  completed: boolean;
}

interface State {
  status: 'draft' | 'in-progress' | 'needs-input' | 'completed' | 'failed'
  subtasks: Array<Subtask>
}

interface Action {
  tool: string;
  payload: unknown;
}

interface AgentParams {
  plan: string
  tools: string[]
  subtasks: Array<Subtask>
  continue: State
}

function createState(params: AgentParams): State {
  return {
    status: 'in-progress',
    subtasks: params.subtasks
  }
}

function updateState(state: State, actions: Array<Action>): State {
  return state;
}

function stateIsInProgress(state: State): boolean {
  if (state.subtasks.every(t => t.completed)) {
    return false
  }

  return state.status === 'in-progress'
}

export async function executeLoop(params: AgentParams) {
  let state = createState(params)
  let actions: Array<Action> = []

  do {
    state = updateState(state, actions)
  } while (stateIsInProgress(state))
}
