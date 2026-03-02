import {
  Box,
  BoxRenderable,
  createCliRenderer,
  InputRenderable,
  InputRenderableEvents,
  ScrollBox,
  Text,
  TextRenderable,
  type RenderContext,
} from "@opentui/core";
import { AgentState } from "../state";

export async function renderRoot(runAgent: (p: string) => Promise<string>) {
  const renderer = await createCliRenderer();

  const container = new BoxRenderable(renderer, {
    id: "container",
    flexDirection: "column",
    padding: 1,
    gap: 0.5,
  });

  const title = new TextRenderable(renderer, {
    id: "title",
    content: "Nanoha Agent 🦚",
  });

  const messageContainer = renderMessages(renderer);
  const input = renderInput(renderer, runAgent);

  container.add(title);
  container.add(messageContainer);
  container.add(input);

  renderer.root.add(container);
}

function renderInput(renderer: RenderContext, onEnter: (str: string) => void) {
  const container = Box({
    border: true,
  });
  const input = new InputRenderable(renderer, {
    id: "input",
    placeholder: "What would you like to work on today?",
  });

  container.add(input);

  input.on(InputRenderableEvents.ENTER, (e) => {
    const value = input.value;
    onEnter(value);
  });
  input.focus();

  return container;
}

function renderMessages(renderer: RenderContext) {
  const messages = AgentState.isInitialized ? AgentState.current.messages : [];

  const output = new BoxRenderable(renderer, {
    border: true,
  });

  const scrollable = ScrollBox({ id: "scrollable" });

  output.add(scrollable);

  const placeholder = Text({
    id: "placeholderText",
    content: "Hey there, what would you like to build with Nanoha today?",
  });

  if (messages.length === 0) {
    scrollable.add(placeholder);
  } else {
    for (const message in messages) {
      scrollable.add(
        Text({
          content: JSON.stringify(message),
        }),
      );
    }
  }

  return output;
}
