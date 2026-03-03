import { render } from "@opentui/solid";
import { For, createSignal, onCleanup } from "solid-js";
import { runAgent } from "../main";
import { AgentState, type Subtask } from "../state";
import type { ModelMessage } from "ai";

const App = () => {
  const [prompt, setPrompt] = createSignal("");
  const [messages, setMessages] = createSignal<ModelMessage[]>([]);
  const [agentStatus, setStatus] = createSignal("todo");
  const [plan, setPlan] = createSignal<Subtask[]>([]);

  const unsubscribe = AgentState.subscribe((state) => {
    const { messages, status, subtasks } = state
    setStatus(status)
    setMessages([...messages]);
    setPlan(subtasks.length > 0 ? subtasks : plan)
  });

  onCleanup(() => {
    unsubscribe();
  });

  const handleSubmit = async () => {
    const value = prompt().trim();
    if (!value) {
      return;
    }
    setPrompt("");
    await runAgent(value);
  };

  const formatContent = (content: unknown) => {
    const raw = typeof content === "string" ? content : JSON.stringify(content);
    const condensed = raw.replace(/\s+/g, " ").trim();
    return condensed.length > 300 ? `${condensed.slice(0, 297)}...` : condensed;
  };

  return (
    <box gap={0.5}>
      <text>Welcome to Nanoha! 🦚</text>
      <scrollbox gap={0.1}>
        <For each={messages()}>
          {(message) => (
            <text>{`${message.role}: ${formatContent(message.content)}`}</text>
          )}
        </For>
      </scrollbox>
      <box flexDirection="column" gap={0.25}>
        <For each={plan()}>
          {(task) => (
            <text>[{task.completed ? "x" : " "}] {task.label}</text>
          )}
        </For>
      </box>
      <box backgroundColor="green">
      <text>{agentStatus()}</text>
      </box>
      <box padding={0.5} border>
        <input
          paddingX={0.5}
          focused
          value={prompt()}
          placeholder="What are we building today?"
          onInput={(value) => setPrompt(value)}
          onKeyDown={(event) => {
            if (event.name === "return") {
              void handleSubmit();
            }
          }}
        />
      </box>
    </box>
  );
};

export function startApp() {
  return render(App);
}
