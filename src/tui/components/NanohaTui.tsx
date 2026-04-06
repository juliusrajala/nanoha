/** @jsxImportSource @opentui/react */

import type { TextareaRenderable } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import { useCallback, useRef, useState } from "react";
import type { AgentSession } from "../../main";
import { Composer } from "./Composer";
import { MessagePane } from "./MessagePane";
import { StatusHeader } from "./StatusHeader";

export function NanohaTui({ session }: { session: AgentSession }) {
  const renderer = useRenderer();
  const [draft, setDraft] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [inputEpoch, setInputEpoch] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [messages, setMessages] = useState(session.getMessages());
  const textareaRef = useRef<TextareaRenderable | null>(null);
  const isRunningRef = useRef(false);

  const focusComposer = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const submitPrompt = useCallback(
    async (submitted?: string) => {
      const value = (submitted ?? draft).trim();
      if (!value || isRunningRef.current) return;

      isRunningRef.current = true;
      setIsRunning(true);
      setDraft("");
      setStatus("Running...");

      try {
        const runPromise = session.run({
          prompt: value,
          handler: (update) => {
            switch (update.type) {
              case "tool-call":
                setStatus(`[tool] ${update.toolName}`);
                setMessages(session.getMessages());
                break;
              case "tool-result":
                setStatus(`[tool done] ${update.toolName}`);
                setMessages(session.getMessages());
                break;
              case "text-end":
                setMessages(session.getMessages());
                break;
              case "error":
              case "tool-error":
                setStatus("Error");
                setMessages(session.getMessages());
                break;
              default:
                break;
            }
          },
        });

        setMessages(session.getMessages());

        await runPromise;
        setMessages(session.getMessages());
        setStatus("Done");
      } catch (error) {
        setStatus(`Error: ${String(error)}`);
      } finally {
        setDraft("");
        setInputEpoch((n) => n + 1);
        isRunningRef.current = false;
        setIsRunning(false);
      }
    },
    [draft, session],
  );

  useKeyboard((key) => {
    if (key.name === "escape") {
      renderer.destroy();
    }
  });

  return (
    <box
      flexDirection="column"
      padding={1}
      gap={1}
      width="100%"
      height="100%"
      onMouseDown={focusComposer}
    >
      <StatusHeader status={status} />
      <MessagePane messages={messages} />
      <Composer
        key={`composer-${inputEpoch}`}
        ref={textareaRef}
        draft={draft}
        isRunning={isRunning}
        onChange={setDraft}
        onSubmit={() => {
          const value = textareaRef.current?.plainText ?? draft;
          void submitPrompt(value);
        }}
      />
    </box>
  );
}
