/** @jsxImportSource @opentui/react */

import { useMemo } from "react";
import type { AgentMessage } from "../../agent/messages";
import { syntaxStyle } from "../styles";

export function MessagePane({
  messages,
  streamingText = "",
}: {
  messages: AgentMessage[];
  streamingText?: string;
}) {
  const entries = useMemo(() => collapseMessages(messages), [messages]);

  return (
    <box flexGrow={1} flexShrink={1} minHeight={3}>
      <scrollbox stickyScroll stickyStart="bottom" style={{ height: "100%", width: "100%" }}>
        <box flexDirection="column" gap={1} width="100%">
          {entries.length === 0 && (
            <text fg="#94a3b8">Hey there - ask me to inspect or edit your project.</text>
          )}
          {entries.map((entry) => (
            <MessageItem key={entry.id} message={entry} />
          ))}
          {streamingText.trim() && (
            <MessageText roleColor="#8b5cf6" text={streamingText} streaming />
          )}
        </box>
      </scrollbox>
    </box>
  );
}

type MessageEntry =
  | AgentMessage
  | {
      id: string;
      type: "tool-activity";
      toolName: string;
      input: unknown;
      output: unknown;
    };

function MessageItem({ message }: { message: MessageEntry }) {
  switch (message.type) {
    case "user":
      return <MessageText roleColor="#3b82f6" text={message.text} />;
    case "assistant":
      return <MessageText roleColor="#8b5cf6" text={message.text} />;
    case "tool-call":
      return (
        <text>
          <span fg="#f59e0b">| </span>
          <span fg="#fbbf24">{message.toolName}</span>
          <br />
          <span fg="#94a3b8">{previewValue(message.input)}</span>
        </text>
      );
    case "tool-result":
      return (
        <text>
          <span fg="#10b981">| </span>
          <span fg="#6ee7b7">{message.toolName}</span>
          <br />
          <span fg="#94a3b8">{previewValue(message.output)}</span>
        </text>
      );
    case "tool-approval-request":
      return (
        <text>
          <span fg="#f59e0b">| </span>
          <span fg="#fbbf24">approval {message.toolName}</span>
          <br />
          <span fg="#94a3b8">{previewValue(message.input)}</span>
        </text>
      );
    case "tool-activity":
      return (
        <text>
          <span fg="#10b981">| </span>
          <span fg="#6ee7b7">{message.toolName}</span>
          <span fg="#94a3b8"> {previewValue(message.input)}</span>
          <br />
          <span fg="#94a3b8">{previewValue(message.output)}</span>
        </text>
      );
    case "tool-error":
      return (
        <text>
          <span fg="#ef4444">| </span>
          <span fg="#fca5a5">{pretty(message.error)}</span>
        </text>
      );
    case "error":
      return (
        <text>
          <span fg="#f97316">| </span>
          <span fg="#f87171">{pretty(message.error)}</span>
        </text>
      );
    default:
      return <text />;
  }
}

function collapseMessages(messages: AgentMessage[]): MessageEntry[] {
  const entries: MessageEntry[] = [];

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    const nextMessage = messages[index + 1];

    if (
      message?.type === "tool-call" &&
      nextMessage?.type === "tool-approval-request" &&
      nextMessage.toolName === message.toolName
    ) {
      entries.push(message);
      index += 1;
      continue;
    }

    if (
      message?.type === "tool-call" &&
      nextMessage?.type === "tool-result" &&
      nextMessage.toolName === message.toolName
    ) {
      entries.push({
        id: `${message.id}:${nextMessage.id}`,
        type: "tool-activity",
        toolName: message.toolName,
        input: message.input,
        output: nextMessage.output,
      });
      index += 1;
      continue;
    }

    if (message) {
      entries.push(message);
    }
  }

  return entries;
}

function MessageText({
  roleColor,
  text,
  streaming = false,
}: {
  roleColor: string;
  text: string;
  streaming?: boolean;
}) {
  return (
    <box flexDirection="row" alignItems="flex-start" width="100%">
      <text>
        <span fg={roleColor}>| </span>
      </text>
      <box flexGrow={1} flexShrink={1} minWidth={0}>
        <markdown
          content={normalizeDisplayText(text)}
          syntaxStyle={syntaxStyle}
          streaming={streaming}
        />
      </box>
    </box>
  );
}

function previewValue(value: unknown): string {
  return truncate(pretty(value).replace(/\s+/g, " ").trim(), 120);
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

function pretty(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeDisplayText(value: string): string {
  return value.replace(/^\s*\n+/, "");
}
