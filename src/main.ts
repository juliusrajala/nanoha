import { getDirectoryContext } from "./config";
import {
  createFileTool,
  createEditFileTool,
  createListFilesTool,
  createReadFileTool,
} from "./tools";
import { CodingAgent } from "./agent/agent";
import type { AgentMessage } from "./agent/messages";
import type { TextStreamPart } from "ai";

interface Options {
  onlyPlan: boolean;
}

interface AgentParams {
  prompt: string;
  handler?: (update: TextStreamPart<any>) => void;
  options?: Partial<Options>;
}

export interface AgentSession {
  run: (input: AgentParams) => Promise<unknown>;
  getMessages: () => AgentMessage[];
}

function buildTools(onlyPlan: boolean) {
  const writeTools = {
    createFile: createFileTool(),
    editFile: createEditFileTool(),
  };

  const readTools = {
    readFile: createReadFileTool(),
    listFiles: createListFilesTool(),
  };

  return onlyPlan ? readTools : { ...writeTools, ...readTools };
}

export async function createAgentSession(options: Partial<Options> = {}): Promise<AgentSession> {
  const onlyPlan = Boolean(options.onlyPlan);
  const directoryContext = await getDirectoryContext();
  const tools = buildTools(onlyPlan);

  const agent = new CodingAgent(tools, {
    projectContext: directoryContext,
  });

  return {
    run: ({ prompt, handler }) => agent.stream(prompt, handler),
    getMessages: () => agent.getMessages(),
  };
}

export async function runAgent({ prompt, options = {}, handler }: AgentParams) {
  const session = await createAgentSession(options);
  return await session.run({ prompt, handler });
}
