import type { ModelMessage } from "@ai-sdk/provider-utils";
import type { TextStreamPart, ToolApprovalResponse } from "ai";

interface BaseMessage {
  id: string;
  createdAt: number;
}

type TranscriptEntry =
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
    })
  | (BaseMessage & {
      type: "model-message";
      message: ModelMessage;
    });

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
  // A single transcript keeps model-visible turns and UI-only stream events in
  // one ordered timeline. The getters project this into the shape each caller
  // needs instead of making CodingAgent synchronize multiple stores.
  private transcript: TranscriptEntry[] = [];

  getAll(): AgentMessage[] {
    return this.transcript.flatMap((entry): AgentMessage[] => {
      // Model messages are kept for replaying the conversation, but the UI only
      // renders the cleaner event-oriented entries.
      if (entry.type === "model-message") {
        return [];
      }

      return [entry];
    });
  }

  getModelMessages(): ModelMessage[] {
    return this.transcript.flatMap((entry): ModelMessage[] => {
      if (entry.type === "user") {
        return [{ role: "user", content: entry.text }];
      }

      if (entry.type === "model-message") {
        return [entry.message];
      }

      // Tool calls, approval requests, and streamed assistant text are kept as
      // transcript events for the UI. The SDK's finalized messages are the
      // canonical model input for those parts of the conversation.
      return [];
    });
  }

  addUser(text: string) {
    this.transcript.push({
      ...this.nextMeta(),
      type: "user",
      text,
    });
  }

  addAssistant(text: string) {
    this.transcript.push({
      ...this.nextMeta(),
      type: "assistant",
      text,
    });
  }

  appendModelMessages(messages: ModelMessage[]) {
    for (const message of messages) {
      this.transcript.push({
        ...this.nextMeta(),
        type: "model-message",
        message,
      });
    }
  }

  addToolApprovalResponses(responses: ToolApprovalResponse[]) {
    // Approval responses must be stored as a tool-role model message so the
    // next streaming pass resumes from the paused approval point.
    this.appendModelMessages([
      {
        role: "tool",
        content: responses,
      },
    ]);
  }

  addFromShard(shard: TextStreamPart<any>) {
    if (shard.type === "tool-call") {
      this.transcript.push({
        ...this.nextMeta(),
        type: "tool-call",
        toolName: shard.toolName,
        input: shard.input,
      });
      return;
    }

    if (shard.type === "tool-result") {
      this.transcript.push({
        ...this.nextMeta(),
        type: "tool-result",
        toolName: shard.toolName,
        output: shard.output,
      });
      return;
    }

    if (shard.type === "tool-approval-request") {
      this.transcript.push({
        ...this.nextMeta(),
        type: "tool-approval-request",
        toolName: shard.toolCall.toolName,
        input: shard.toolCall.input,
        approvalId: shard.approvalId,
      });
      return;
    }

    if (shard.type === "tool-error") {
      this.transcript.push({
        ...this.nextMeta(),
        type: "tool-error",
        error: shard.error,
      });
      return;
    }

    if (shard.type === "error") {
      this.transcript.push({
        ...this.nextMeta(),
        type: "error",
        error: shard.error,
      });
    }
  }

  private nextMeta(): BaseMessage {
    return {
      id: `${Date.now()}-${this.transcript.length}`,
      createdAt: Date.now(),
    };
  }
}
