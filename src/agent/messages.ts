import type { ModelMessage } from "@ai-sdk/provider-utils";
import type { TextStreamPart } from "ai";

interface BaseMessage {
  id: string;
  createdAt: number;
}

export type AgentMessage =
  | (BaseMessage & {
      type: "user";
      text: string;
    })
  | (BaseMessage & {
      type: "assistant";
      text: string;
    })
  | (BaseMessage & {
      type: "tool-call";
      toolName: string;
      input: unknown;
    })
  | (BaseMessage & {
      type: "tool-result";
      toolName: string;
      output: unknown;
    })
  | (BaseMessage & {
      type: "tool-approval-request";
      toolName: string;
      input: unknown;
      approvalId: string;
    })
  | (BaseMessage & {
      type: "tool-error";
      error: unknown;
    })
  | (BaseMessage & {
      type: "error";
      error: unknown;
    });

export class AgentMessageHistory {
  private messages: AgentMessage[] = [];

  getAll(): AgentMessage[] {
    return [...this.messages];
  }

  toModelMessages(): ModelMessage[] {
    return this.messages.flatMap((message): ModelMessage[] => {
      switch (message.type) {
        case "user":
          return [{ role: "user", content: message.text }];
        case "assistant":
          return [{ role: "assistant", content: message.text }];
        default:
          return [];
      }
    });
  }

  addUser(text: string) {
    this.messages.push({
      ...this.nextMeta(),
      type: "user",
      text,
    });
  }

  addAssistant(text: string) {
    this.messages.push({
      ...this.nextMeta(),
      type: "assistant",
      text,
    });
  }

  addFromShard(shard: TextStreamPart<any>) {
    if (shard.type === "tool-call") {
      this.messages.push({
        ...this.nextMeta(),
        type: "tool-call",
        toolName: shard.toolName,
        input: shard.input,
      });
      return;
    }

    if (shard.type === "tool-result") {
      this.messages.push({
        ...this.nextMeta(),
        type: "tool-result",
        toolName: shard.toolName,
        output: shard.output,
      });
      return;
    }

    if (shard.type === "tool-approval-request") {
      this.messages.push({
        ...this.nextMeta(),
        type: "tool-approval-request",
        toolName: shard.toolCall.toolName,
        input: shard.toolCall.input,
        approvalId: shard.approvalId,
      });
      return;
    }

    if (shard.type === "tool-error") {
      this.messages.push({
        ...this.nextMeta(),
        type: "tool-error",
        error: shard.error,
      });
      return;
    }

    if (shard.type === "error") {
      this.messages.push({
        ...this.nextMeta(),
        type: "error",
        error: shard.error,
      });
    }
  }

  private nextMeta(): BaseMessage {
    return {
      id: `${Date.now()}-${this.messages.length}`,
      createdAt: Date.now(),
    };
  }
}
