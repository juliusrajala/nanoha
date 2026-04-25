import { RGBA, SyntaxStyle } from "@opentui/core";

export const markdownSyntaxStyle = SyntaxStyle.fromStyles({
  default: { fg: RGBA.fromHex("#e5e7eb") },
  conceal: { fg: RGBA.fromHex("#6b7280"), dim: true },
  "markup.heading": { fg: RGBA.fromHex("#f9a8d4"), bold: true },
  "markup.raw": { fg: RGBA.fromHex("#fbbf24") },
  "markup.strong": { fg: RGBA.fromHex("#f8fafc"), bold: true },
  "markup.italic": { fg: RGBA.fromHex("#cbd5e1"), italic: true },
  "markup.strikethrough": { fg: RGBA.fromHex("#94a3b8"), dim: true },
  "markup.link": { fg: RGBA.fromHex("#60a5fa") },
  "markup.link.label": { fg: RGBA.fromHex("#93c5fd"), underline: true },
  "markup.link.url": { fg: RGBA.fromHex("#94a3b8") },
  keyword: { fg: RGBA.fromHex("#c084fc") },
  string: { fg: RGBA.fromHex("#86efac") },
  number: { fg: RGBA.fromHex("#fca5a5") },
  comment: { fg: RGBA.fromHex("#6b7280"), italic: true },
  function: { fg: RGBA.fromHex("#7dd3fc") },
  type: { fg: RGBA.fromHex("#fdba74") },
});
