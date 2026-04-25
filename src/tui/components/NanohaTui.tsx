/** @jsxImportSource @opentui/react */

import type { TextareaRenderable } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentSession } from "../../main";
import { Composer } from "./Composer";
import { MessagePane } from "./MessagePane";
import { StatusHeader } from "./StatusHeader";

interface PendingApproval {
  toolName: string;
  command: string;
  resolve: (approved: boolean) => void;
}

export function NanohaTui({ session }: { session: AgentSession }) {
  const renderer = useRenderer();
  const [draft, setDraft] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [inputEpoch, setInputEpoch] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [messages, setMessages] = useState(session.getMessages());
  const [streamingText, setStreamingText] = useState("");
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const textareaRef = useRef<TextareaRenderable | null>(null);
  const isRunningRef = useRef(false);
  const runAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    session.setCommandApprovalHandler(async (request) => {
      return await new Promise<boolean>((resolve) => {
        setPendingApproval({
          toolName: request.toolName,
          command: formatApprovalCommand(request.input),
          resolve,
        });
        setStatus("Awaiting command approval");
      });
    });

    return () => {
      runAbortControllerRef.current?.abort();
      session.abort();
      session.setCommandApprovalHandler(undefined);
    };
  }, [session]);

  const focusComposer = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const submitPrompt = useCallback(
    async (submitted: string) => {
      const value = (submitted ?? draft).trim();
      if (!value || isRunningRef.current) return;

      isRunningRef.current = true;
      setIsRunning(true);
      setDraft("");
      setStatus("Running...");
      const abortController = new AbortController();
      runAbortControllerRef.current = abortController;

      try {
        const runPromise = session.run({
          prompt: value,
          signal: abortController.signal,
          subscriber: (update) => {
            switch (update.type) {
              case "tool-call":
                setStatus(`[tool] ${update.toolName}`);
                setMessages(session.getMessages());
                break;
              case "tool-result":
                setStatus(`[tool done] ${update.toolName}`);
                setMessages(session.getMessages());
                break;
              case "tool-approval-request":
                setStatus("Awaiting command approval");
                setMessages(session.getMessages());
                break;
              case "text-delta":
                setStreamingText((current) => current + update.text);
                break;
              case "text-end":
                setStreamingText("");
                setMessages(session.getMessages());
                break;
              case "error":
              case "tool-error":
                setStreamingText("");
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
        setStreamingText("");
      } catch (error) {
        if (abortController.signal.aborted) {
          setStatus("Cancelled");
        } else {
          setStatus(`Error: ${String(error)}`);
        }
        setStreamingText("");
      } finally {
        setDraft("");
        setInputEpoch((n) => n + 1);
        isRunningRef.current = false;
        setIsRunning(false);
        if (runAbortControllerRef.current === abortController) {
          runAbortControllerRef.current = null;
        }
      }
    },
    [draft, session],
  );

  useKeyboard((key) => {
    if (pendingApproval) {
      if (key.name === "y") {
        pendingApproval.resolve(true);
        setPendingApproval(null);
        setStatus("Command approved");
      } else if (key.name === "n" || key.name === "escape") {
        pendingApproval.resolve(false);
        setPendingApproval(null);
        setStatus("Command denied");
      }
      return;
    }

    if (key.name === "escape") {
      runAbortControllerRef.current?.abort();
      session.abort();
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
      <MessagePane messages={messages} streamingText={streamingText} />
      {pendingApproval ? (
        <box
          flexDirection="column"
          borderStyle="single"
          borderColor="#cc8800"
          padding={1}
          flexShrink={0}
        >
          <text fg="#fbbf24">Approve command?</text>
          <text fg="#94a3b8">{pendingApproval.command}</text>
          <text fg="#888888">Y yes N no</text>
        </box>
      ) : (
        <Composer
          key={`composer-${inputEpoch}`}
          draft={draft}
          isRunning={isRunning}
          onSubmit={(value) => {
            void submitPrompt(value);
          }}
        />
      )}
    </box>
  );
}

function formatApprovalCommand(input: unknown): string {
  if (
    input &&
    typeof input === "object" &&
    "command" in input &&
    typeof input.command === "string"
  ) {
    return input.command;
  }

  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}
