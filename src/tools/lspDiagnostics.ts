import { tool } from "ai";
import z from "zod";
import { resolve } from "node:path";
import { isExcluded } from "../config";
import { getTypeScriptLspConfig } from "../config/lsp";
import { formatDiagnosticsOutput } from "../lsp/formatDiagnostics";
import { getTypeScriptLspManager } from "../lsp/manager";

export function createLspDiagnosticsTool() {
  const config = getTypeScriptLspConfig();

  return tool({
    description:
      "Run TypeScript language-server diagnostics for a file and return findings as path:line:column severity message.",
    inputSchema: z.object({
      filePath: z.string().describe("Path to a TypeScript or JavaScript file."),
    }),
    execute: async ({ filePath }) => {
      if (isExcluded(filePath)) return "Error: access to this file is restricted.";

      const absolutePath = resolve(process.cwd(), filePath);
      const manager = getTypeScriptLspManager();

      try {
        const diagnostics = await manager.getDiagnostics(absolutePath);
        return formatDiagnosticsOutput(absolutePath, diagnostics, config.maxDiagnostics);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown diagnostics error.";
        return `Error: unable to fetch language-server diagnostics. ${message}`;
      }
    },
  });
}
