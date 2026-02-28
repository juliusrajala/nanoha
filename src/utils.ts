import type { Subtask } from "./state";

export function logTasks(subtasks: Array<Subtask>) {
  const taskString = subtasks.map(st => `[${st.completed ? 'x' : ' '}] ${st.label}`).join('\n')
  console.log(taskString)
}
