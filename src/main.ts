import { getDirectoryContext } from "./config";
import {
  createFileTool,
  createEditFileTool,
  createListFilesTool,
  createReadFileTool,
  createRunCommandTool,
  createLspDiagnosticsTool,
} from "./tools";
import { CodingAgent } from "./agent/agent";
import type { AgentMessage } from "./agent/messages";
import type { TextStreamPart } from "ai";

export type CommandApprovalHandler = (request: {
  approvalId: string;
  toolName: string;
  input: unknown;
}) => Promise<boolean>;

interface Options {
  onlyPlan: boolean;
  yolo: boolean;
  commandApprovalHandler?: CommandApprovalHandler;
}

interface AgentParams {
  prompt: string;
  handler?: (update: TextStreamPart<any>) => void;
  signal?: AbortSignal;
}

export interface AgentSession {
  run: (input: AgentParams) => Promise<unknown>;
  getMessages: () => AgentMessage[];
  setCommandApprovalHandler: (handler: CommandApprovalHandler | undefined) => void;
  abort: () => void;
}

function buildTools(onlyPlan: boolean, yolo: boolean) {
  const writeTools = {
    createFile: createFileTool(),
    editFile: createEditFileTool(),
    runCommand: createRunCommandTool({ yolo }),
  };

  const readTools = {
    readFile: createReadFileTool(),
    listFiles: createListFilesTool(),
    lspDiagnostics: createLspDiagnosticsTool(),
  };

  return onlyPlan ? readTools : { ...writeTools, ...readTools };
}

export async function createAgentSession(options: Partial<Options> = {}): Promise<AgentSession> {
  const onlyPlan = Boolean(options.onlyPlan);
  const yolo = Boolean(options.yolo);
  const directoryContext = await getDirectoryContext();
  const tools = buildTools(onlyPlan, yolo);
  let commandApprovalHandler = options.commandApprovalHandler;

  const agent = new CodingAgent(tools, {
    projectContext: directoryContext,
    requestToolApproval: async (request) => {
      if (yolo) return true;
      if (!commandApprovalHandler) return false;
      return await commandApprovalHandler(request);
    },
  });
  let activeController: AbortController | undefined;

  return {
    run: async ({ prompt, handler, signal }) => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      if (signal) {
        if (signal.aborted) {
          controller.abort(signal.reason);
        } else {
          signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
        }
      }

      try {
        return await agent.stream(prompt, handler, { signal: controller.signal });
      } finally {
        if (activeController === controller) {
          activeController = undefined;
        }
      }
    },
    getMessages: () => agent.getMessages(),
    setCommandApprovalHandler: (handler) => {
      commandApprovalHandler = handler;
    },
    abort: () => activeController?.abort(),
  };
}

export async function runAgent(
  { prompt, handler, signal }: AgentParams,
  options: Partial<Options> = {},
) {
  const session = await createAgentSession(options);
  return await session.run({ prompt, handler, signal });
}
