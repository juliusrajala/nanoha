import { expect, test } from "bun:test";
import { buildLspFrame, parseLspMessages } from "./protocol";

test("parseLspMessages parses a single framed payload", () => {
  const frame = buildLspFrame({ jsonrpc: "2.0", id: 1, result: { ok: true } });
  const parsed = parseLspMessages(frame);

  expect(parsed.messages).toEqual([{ jsonrpc: "2.0", id: 1, result: { ok: true } }]);
  expect(parsed.rest.length).toBe(0);
});

test("parseLspMessages parses multiple payloads in one buffer", () => {
  const one = buildLspFrame({ jsonrpc: "2.0", id: 1, result: "a" });
  const two = buildLspFrame({ jsonrpc: "2.0", id: 2, result: "b" });
  const parsed = parseLspMessages(Buffer.concat([one, two]));

  expect(parsed.messages).toEqual([
    { jsonrpc: "2.0", id: 1, result: "a" },
    { jsonrpc: "2.0", id: 2, result: "b" },
  ]);
  expect(parsed.rest.length).toBe(0);
});

test("parseLspMessages keeps incomplete frame bytes as rest", () => {
  const frame = buildLspFrame({ jsonrpc: "2.0", id: 1, result: { ok: true } });
  const splitAt = Math.max(1, frame.length - 5);
  const parsed = parseLspMessages(frame.subarray(0, splitAt));

  expect(parsed.messages).toEqual([]);
  expect(parsed.rest.length).toBe(splitAt);
});

test("parseLspMessages throws on invalid content length", () => {
  const invalid = Buffer.from("Content-Length: nope\r\n\r\n{}", "utf8");
  expect(() => parseLspMessages(invalid)).toThrow("Invalid LSP Content-Length header.");
});
