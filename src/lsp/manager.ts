import { resolve, extname } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { pathToFileURL } from "node:url";
import { getTypeScriptLspConfig } from "../config/lsp";
import { type LspDiagnostic } from "./formatDiagnostics";
import { buildLspFrame, parseLspMessages } from "./protocol";

interface JsonRpcError {
  message?: string;
}

interface JsonRpcResponse {
  id?: number;
  result?: unknown;
  error?: JsonRpcError;
}

interface PublishDiagnosticsNotification {
  method: "textDocument/publishDiagnostics";
  params?: {
    uri?: string;
    diagnostics?: LspDiagnostic[];
  };
}

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: Timer;
};

type DiagnosticsWaiter = {
  resolve: (diagnostics: LspDiagnostic[]) => void;
  reject: (error: Error) => void;
  timeout: Timer;
};

const TS_LANGUAGE_IDS: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescriptreact",
  ".js": "javascript",
  ".jsx": "javascriptreact",
  ".mjs": "javascript",
  ".cjs": "javascript",
};

export class TypeScriptLspManager {
  private process?: ChildProcessWithoutNullStreams;
  private pending = new Map<number, PendingRequest>();
  private rawBuffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  private nextId = 1;
  private fileVersions = new Map<string, number>();
  private waiters = new Map<string, DiagnosticsWaiter[]>();
  private latestDiagnostics = new Map<string, LspDiagnostic[]>();
  private stderrTail = "";
  private startPromise?: Promise<void>;
  private config = getTypeScriptLspConfig();
  private registeredExitHandler = false;

  async getDiagnostics(filePath: string): Promise<LspDiagnostic[]> {
    const absolutePath = resolve(process.cwd(), filePath);
    const file = Bun.file(absolutePath);
    if (!(await file.exists())) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    await this.start();

    const uri = pathToFileURL(absolutePath).toString();
    const text = await file.text();
    const languageId = resolveLanguageId(absolutePath);
    const waitForDiagnostics = this.waitForDiagnostics(uri, this.config.diagnosticsTimeoutMs);

    this.openOrUpdate(uri, languageId, text);
    this.notify("textDocument/didSave", {
      textDocument: { uri },
    });

    try {
      const pullResult = await this.request(
        "textDocument/diagnostic",
        { textDocument: { uri } },
        this.config.requestTimeoutMs,
      );
      const pulledDiagnostics = extractPulledDiagnostics(pullResult);
      if (pulledDiagnostics) {
        this.latestDiagnostics.set(uri, pulledDiagnostics);
        return pulledDiagnostics;
      }
    } catch {
      // Fall through to publishDiagnostics notifications.
    }

    try {
      await this.request(
        "textDocument/documentSymbol",
        { textDocument: { uri } },
        this.config.requestTimeoutMs,
      );
    } catch {
      // Some servers may fail this request for non-symbol files; diagnostics can still arrive.
    }

    try {
      return await waitForDiagnostics;
    } catch {
      return this.latestDiagnostics.get(uri) ?? [];
    }
  }

  private async start(): Promise<void> {
    if (this.process) return;
    if (this.startPromise) return this.startPromise;

    this.startPromise = this.boot();
    try {
      await this.startPromise;
    } finally {
      this.startPromise = undefined;
    }
  }

  private async boot(): Promise<void> {
    const { command, args } = this.config;
    ensureCommandIsAvailable(command);
    this.registerExitHandler();

    this.process = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    this.process.stdout.on("data", (chunk: Uint8Array) => this.handleStdoutChunk(chunk));
    this.process.stderr.on("data", (chunk: Uint8Array) => this.handleStderrChunk(chunk));
    this.process.on("error", (error) => this.handleProcessFailure(error));
    this.process.on("exit", (code, signal) => {
      this.handleProcessFailure(
        new Error(
          `TypeScript language server exited (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
        ),
      );
    });

    const rootUri = pathToFileURL(process.cwd()).toString();
    await this.request(
      "initialize",
      {
        processId: process.pid,
        rootUri,
        capabilities: {},
      },
      this.config.requestTimeoutMs,
    );
    this.notify("initialized", {});
  }

  private handleStdoutChunk(chunk: Uint8Array): void {
    this.rawBuffer = Buffer.concat([this.rawBuffer, Buffer.from(chunk)]);

    try {
      const parsed = parseLspMessages(this.rawBuffer);
      this.rawBuffer = parsed.rest;

      for (const message of parsed.messages) {
        this.handleMessage(message);
      }
    } catch (error) {
      this.handleProcessFailure(
        error instanceof Error ? error : new Error("Failed to parse LSP messages."),
      );
    }
  }

  private handleStderrChunk(chunk: Uint8Array): void {
    const next = `${this.stderrTail}${Buffer.from(chunk).toString("utf8")}`;
    this.stderrTail = next.slice(Math.max(0, next.length - 2000));
  }

  private handleMessage(message: unknown): void {
    if (!message || typeof message !== "object") return;

    const response = message as JsonRpcResponse;
    if (typeof response.id === "number") {
      const pending = this.pending.get(response.id);
      if (!pending) return;

      clearTimeout(pending.timeout);
      this.pending.delete(response.id);

      if (response.error) {
        pending.reject(new Error(response.error.message ?? "LSP request failed."));
      } else {
        pending.resolve(response.result);
      }
      return;
    }

    const notification = message as PublishDiagnosticsNotification;
    if (notification.method !== "textDocument/publishDiagnostics") return;

    const uri = notification.params?.uri;
    if (!uri) return;
    const diagnostics = notification.params?.diagnostics ?? [];
    this.latestDiagnostics.set(uri, diagnostics);

    const waiters = this.waiters.get(uri);
    if (!waiters || waiters.length === 0) return;
    this.waiters.delete(uri);
    for (const waiter of waiters) {
      clearTimeout(waiter.timeout);
      waiter.resolve(diagnostics);
    }
  }

  private request(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    const id = this.nextId++;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`LSP request timed out: ${method}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timeout });

      try {
        this.write({ jsonrpc: "2.0", id, method, params });
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(`Failed to send LSP request: ${method}`));
      }
    });
  }

  private notify(method: string, params: unknown): void {
    this.write({ jsonrpc: "2.0", method, params });
  }

  private write(message: unknown): void {
    if (!this.process || !this.process.stdin.writable) {
      throw new Error("TypeScript language server is not running.");
    }
    this.process.stdin.write(buildLspFrame(message));
  }

  private openOrUpdate(uri: string, languageId: string, text: string): void {
    const version = (this.fileVersions.get(uri) ?? 0) + 1;
    this.fileVersions.set(uri, version);

    if (version === 1) {
      this.notify("textDocument/didOpen", {
        textDocument: {
          uri,
          languageId,
          version,
          text,
        },
      });
      return;
    }

    this.notify("textDocument/didChange", {
      textDocument: {
        uri,
        version,
      },
      contentChanges: [{ text }],
    });
  }

  private waitForDiagnostics(uri: string, timeoutMs: number): Promise<LspDiagnostic[]> {
    return new Promise((resolve, reject) => {
      const waiter: DiagnosticsWaiter = {
        resolve,
        reject,
        timeout: setTimeout(() => {
          const queue = this.waiters.get(uri);
          if (!queue) return;
          this.waiters.set(
            uri,
            queue.filter((entry) => entry !== waiter),
          );
          reject(new Error("Timed out waiting for diagnostics."));
        }, timeoutMs),
      };

      const queue = this.waiters.get(uri) ?? [];
      queue.push(waiter);
      this.waiters.set(uri, queue);
    });
  }

  private handleProcessFailure(error: Error): void {
    const hint = this.stderrTail.trim() ? `\nServer stderr:\n${this.stderrTail.trim()}` : "";
    const wrapped = new Error(`${error.message}${hint}`);

    for (const [, pending] of this.pending) {
      clearTimeout(pending.timeout);
      pending.reject(wrapped);
    }
    this.pending.clear();

    for (const [, handlers] of this.waiters) {
      for (const handler of handlers) {
        clearTimeout(handler.timeout);
        handler.reject(wrapped);
      }
    }
    this.waiters.clear();

    if (this.process) {
      this.process.removeAllListeners();
      this.process = undefined;
    }
  }

  private registerExitHandler(): void {
    if (this.registeredExitHandler) return;
    this.registeredExitHandler = true;

    process.once("beforeExit", () => {
      if (!this.process || this.process.killed) return;
      this.process.kill();
    });
  }
}

let manager: TypeScriptLspManager | undefined;

export function getTypeScriptLspManager(): TypeScriptLspManager {
  manager ??= new TypeScriptLspManager();
  return manager;
}

function resolveLanguageId(filePath: string): string {
  const extension = extname(filePath).toLowerCase();
  return TS_LANGUAGE_IDS[extension] ?? "plaintext";
}

function ensureCommandIsAvailable(command: string): void {
  if (!command || command.includes("/") || command.includes("\\")) return;

  if (!Bun.which(command)) {
    throw new Error(
      `Language server command "${command}" was not found in PATH. Install it with "bun add -d typescript typescript-language-server" or set LSP_TS_SERVER_CMD.`,
    );
  }
}

function extractPulledDiagnostics(result: unknown): LspDiagnostic[] | undefined {
  if (!result || typeof result !== "object") return undefined;
  if (!("items" in result)) return undefined;
  const items = (result as { items?: unknown }).items;
  if (!Array.isArray(items)) return undefined;
  return items as LspDiagnostic[];
}
