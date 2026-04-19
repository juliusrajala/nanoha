import { relative } from "node:path";

export interface LspPosition {
  line: number;
  character: number;
}

export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

export interface LspDiagnostic {
  range: LspRange;
  severity?: number;
  code?: string | number;
  source?: string;
  message: string;
}

export function formatDiagnosticsOutput(
  absolutePath: string,
  diagnostics: LspDiagnostic[],
  maxDiagnostics: number,
): string {
  const displayPath = relative(process.cwd(), absolutePath) || absolutePath;

  if (diagnostics.length === 0) {
    return `No diagnostics in ${displayPath}.`;
  }

  const visibleDiagnostics = diagnostics.slice(0, maxDiagnostics);
  const lines = visibleDiagnostics.map((diagnostic) =>
    formatDiagnosticLine(displayPath, diagnostic),
  );
  const remaining = diagnostics.length - visibleDiagnostics.length;

  if (remaining > 0) {
    lines.push(`... ${remaining} more diagnostics omitted.`);
  }

  return lines.join("\n");
}

function formatDiagnosticLine(path: string, diagnostic: LspDiagnostic): string {
  const line = diagnostic.range.start.line + 1;
  const column = diagnostic.range.start.character + 1;
  const severity = mapSeverity(diagnostic.severity);
  const code = diagnostic.code ? ` ${diagnostic.code}` : "";
  const source = diagnostic.source ? ` [${diagnostic.source}]` : "";
  const message = diagnostic.message.replace(/\s+/g, " ").trim();
  return `${path}:${line}:${column} ${severity}${code} ${message}${source}`;
}

function mapSeverity(severity: number | undefined): string {
  switch (severity) {
    case 1:
      return "error";
    case 2:
      return "warning";
    case 3:
      return "info";
    case 4:
      return "hint";
    default:
      return "unknown";
  }
}
