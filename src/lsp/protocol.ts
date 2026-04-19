const HEADER_SEPARATOR = "\r\n\r\n";

export function buildLspFrame(message: unknown): Buffer {
  const payload = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n`;
  return Buffer.concat([Buffer.from(header, "utf8"), Buffer.from(payload, "utf8")]);
}

export interface ParsedLspMessages {
  messages: unknown[];
  rest: Buffer;
}

export function parseLspMessages(buffer: Buffer): ParsedLspMessages {
  const messages: unknown[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const headerEnd = buffer.indexOf(HEADER_SEPARATOR, offset, "utf8");
    if (headerEnd === -1) break;

    const headerBlock = buffer.toString("utf8", offset, headerEnd);
    const contentLength = parseContentLength(headerBlock);
    const bodyStart = headerEnd + HEADER_SEPARATOR.length;
    const bodyEnd = bodyStart + contentLength;

    if (bodyEnd > buffer.length) break;

    const payload = buffer.toString("utf8", bodyStart, bodyEnd);
    messages.push(JSON.parse(payload));
    offset = bodyEnd;
  }

  return {
    messages,
    rest: buffer.subarray(offset),
  };
}

function parseContentLength(headerBlock: string): number {
  for (const line of headerBlock.split("\r\n")) {
    const [name, rawValue] = line.split(":");
    if (!name || !rawValue) continue;
    if (name.trim().toLowerCase() !== "content-length") continue;
    const value = Number.parseInt(rawValue.trim(), 10);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Invalid LSP Content-Length header.");
    }
    return value;
  }

  throw new Error("Missing LSP Content-Length header.");
}
