import { openai } from "@ai-sdk/openai";
import { ToolLoopAgent, type TextStreamPart, type ToolSet } from "ai";
import { buildSystemPrompt } from "./prompts";
import { AgentMessageHistory, type AgentMessage } from "./messages";

interface Options {
  projectContext: string;
}

type StreamHandler = (part: TextStreamPart<any>) => void;

export class CodingAgent {
  private agent: ToolLoopAgent;
  private history = new AgentMessageHistory();

  constructor(tools: ToolSet, options: Options) {
    const instructions = buildSystemPrompt(options.projectContext);

    this.agent = new ToolLoopAgent({
      instructions,
      model: openai("gpt-5.4-mini"),
      tools,
    });
  }

  getMessages(): AgentMessage[] {
    return this.history.getAll();
  }

  async stream(prompt: string, handler?: StreamHandler) {
    this.history.addUser(prompt);

    const { fullStream, output } = await this.agent.stream({
      messages: this.history.toModelMessages(),
    });
    let currentAssistantMessage = "";

    for await (const shard of fullStream) {
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

      this.history.addFromShard(shard);
      handler?.(shard);
    }

    if (currentAssistantMessage.trim()) {
      this.history.addAssistant(currentAssistantMessage);
    }

    return output;
  }
}
