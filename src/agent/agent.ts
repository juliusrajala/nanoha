import {
  stepCountIs,
  streamText,
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

interface ApprovalRequest {
  approvalId: string;
  toolName: string;
  input: unknown;
}

interface StreamPassResult {
  approvalRequests: ApprovalRequest[];
  output: unknown;
}

interface StreamOptions {
  signal?: AbortSignal;
}

export type AgentStatus = "idle" | "running" | "awaiting-approval";

export class CodingAgent {
  private history = new AgentMessageHistory();

  private instructions: string;
  private tools: ToolSet;
  private requestToolApproval: AgentOptions["requestToolApproval"];

  protected status: AgentStatus = "idle";

  constructor(tools: ToolSet, options: AgentOptions) {
    this.instructions = buildSystemPrompt(options.projectContext);
    this.tools = tools;
    this.requestToolApproval = options.requestToolApproval;
  }

  getMessages(): AgentMessage[] {
    return this.history.getAll();
  }

  async stream(prompt: string, handler: StreamHandler, options: StreamOptions = {}) {
    this.history.addUser(prompt);

    while (true) {
      // Each pass either completes the run or stops at a tool approval boundary.
      // We continue by appending approval responses to the transcript instead of
      // recursively re-entering stream(), which would duplicate the user prompt.
      const pass = await this.consumeStream(handler, options);

      if (pass.approvalRequests.length === 0) {
        return pass.output;
      }

      const approvals = await this.resolveApprovalRequests(pass.approvalRequests);
      this.history.addToolApprovalResponses(approvals);
    }
  }

  private async consumeStream(
    handler: StreamHandler,
    options: StreamOptions,
  ): Promise<StreamPassResult> {
    const result = streamText({
      model: getDefaultModel(),
      system: this.instructions,
      // The transcript owns the canonical conversation state for the model.
      messages: this.history.getModelMessages(),
      tools: this.tools,
      stopWhen: stepCountIs(20),
      abortSignal: options.signal,
    });

    let streamableAssistantMessage = "";
    const approvalRequests: ApprovalRequest[] = [];

    for await (const shard of result.fullStream) {
      if (handler) {
        handler(shard);
      }

      if (shard.type === "text-start") {
        streamableAssistantMessage = "";
      }

      if (shard.type === "text-delta") {
        streamableAssistantMessage += shard.text;
      }

      if (shard.type === "text-end") {
        if (streamableAssistantMessage.trim()) {
          // Assistant text is recorded immediately for the UI. The exact
          // assistant/tool turn structure that the SDK returns is appended to
          // the transcript after the stream finishes.
          this.history.addAssistant(streamableAssistantMessage);
        }
        streamableAssistantMessage = "";
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

    if (streamableAssistantMessage.trim()) {
      this.history.addAssistant(streamableAssistantMessage);
    }

    const response = await result.response;
    const output = await result.output;
    // Persist the SDK's finalized messages so the next pass resumes from the
    // exact model-visible transcript, including tool and approval semantics.
    this.history.appendModelMessages(response.messages);

    return {
      approvalRequests,
      output,
    };
  }

  private async resolveApprovalRequests(
    requests: ApprovalRequest[],
  ): Promise<ToolApprovalResponse[]> {
    const approvals: ToolApprovalResponse[] = [];

    for (const request of requests) {
      const approved = this.requestToolApproval ? await this.requestToolApproval(request) : false;

      approvals.push({
        type: "tool-approval-response",
        approvalId: request.approvalId,
        approved,
        reason: approved ? "User approved the command." : "User denied the command.",
      });
    }

    return approvals;
  }
}
