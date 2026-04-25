import {
  stepCountIs,
  streamText,
  type ModelMessage,
  type TextStreamPart,
  type ToolApprovalResponse,
  type ToolSet,
} from "ai";
import { buildSystemPrompt } from "./prompts";
import { AgentMessageHistory, type AgentMessage } from "./messages";
import { getDefaultModel } from "../llm";

interface AgentOptions {
  projectContext: string;
  requestToolApproval?: (request: {
    approvalId: string;
    toolName: string;
    input: unknown;
  }) => Promise<boolean>;
}

type StreamHandler = (part: TextStreamPart<any>) => void;

interface StreamOptions {
  signal?: AbortSignal;
}

export class CodingAgent {
  private history = new AgentMessageHistory();
  private messages: ModelMessage[] = [];
  private instructions: string;
  private tools: ToolSet;
  private requestToolApproval?: AgentOptions["requestToolApproval"];

  constructor(tools: ToolSet, options: AgentOptions) {
    this.instructions = buildSystemPrompt(options.projectContext);
    this.tools = tools;
    this.requestToolApproval = options.requestToolApproval;
  }

  getMessages(): AgentMessage[] {
    return this.history.getAll();
  }

  async stream(prompt: string, handler?: StreamHandler, options: StreamOptions = {}) {
    this.history.addUser(prompt);
    this.messages.push({ role: "user", content: prompt });

    let finalOutput: unknown;

    while (true) {
      const result = streamText({
        model: getDefaultModel(),
        system: this.instructions,
        messages: this.messages,
        tools: this.tools,
        stopWhen: stepCountIs(20),
        abortSignal: options.signal,
      });

      let currentAssistantMessage = "";
      const approvalRequests: Array<{
        approvalId: string;
        toolName: string;
        input: unknown;
      }> = [];

      for await (const shard of result.fullStream) {
        if (handler) {
          handler(shard);
        }

        if (shard.type === "text-start") {
          currentAssistantMessage = "";
        }

        if (shard.type === "text-delta") {
          currentAssistantMessage += shard.text;
        }

        if (shard.type === "text-end") {
          if (currentAssistantMessage.trim()) {
            this.history.addAssistant(currentAssistantMessage);
          }
          currentAssistantMessage = "";
        }

        if (shard.type === "tool-approval-request") {
          approvalRequests.push({
            approvalId: shard.approvalId,
            toolName: shard.toolCall.toolName,
            input: shard.toolCall.input,
          });
        }

        this.history.addFromShard(shard);
      }

      if (currentAssistantMessage.trim()) {
        this.history.addAssistant(currentAssistantMessage);
      }

      const response = await result.response;
      this.messages.push(...response.messages);
      finalOutput = await result.output;

      if (approvalRequests.length === 0) {
        return finalOutput;
      }

      const approvals: ToolApprovalResponse[] = [];
      for (const request of approvalRequests) {
        const approved = this.requestToolApproval ? await this.requestToolApproval(request) : false;

        approvals.push({
          type: "tool-approval-response",
          approvalId: request.approvalId,
          approved,
          reason: approved ? "User approved the command." : "User denied the command.",
        });
      }

      this.messages.push({
        role: "tool",
        content: approvals,
      });
    }
  }
}
