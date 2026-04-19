function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const args = value
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
  return args.length > 0 ? args : fallback;
}

export interface TypeScriptLspConfig {
  command: string;
  args: string[];
  requestTimeoutMs: number;
  diagnosticsTimeoutMs: number;
  maxDiagnostics: number;
}

export function getTypeScriptLspConfig(): TypeScriptLspConfig {
  return {
    command: process.env.LSP_TS_SERVER_CMD?.trim() || "typescript-language-server",
    args: parseArgs(process.env.LSP_TS_SERVER_ARGS, ["--stdio"]),
    requestTimeoutMs: parsePositiveInt(process.env.LSP_REQUEST_TIMEOUT_MS, 10000),
    diagnosticsTimeoutMs: parsePositiveInt(process.env.LSP_DIAGNOSTICS_TIMEOUT_MS, 10000),
    maxDiagnostics: parsePositiveInt(process.env.LSP_MAX_DIAGNOSTICS, 200),
  };
}
