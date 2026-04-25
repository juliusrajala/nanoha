/** @jsxImportSource @opentui/react */

import type { TextareaRenderable } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { useMemo, useRef } from "react";

const MIN_COMPOSER_LINES = 2;
const MAX_COMPOSER_LINES = 12;
const COMPOSER_BORDER_ROWS = 2;

type Props = {
  draft: string;
  isRunning: boolean;
  onSubmit: (text: string) => void;
};
export function Composer({ draft, isRunning, onSubmit }: Props) {
  const { width: terminalWidth } = useTerminalDimensions();
  const ref = useRef<TextareaRenderable>(null);

  const composerHeight = useMemo(
    () =>
      getComposerHeight({
        text: draft,
        terminalWidth,
        minLines: MIN_COMPOSER_LINES,
        maxLines: MAX_COMPOSER_LINES,
        borderRows: COMPOSER_BORDER_ROWS,
      }),
    [draft, terminalWidth],
  );

  return (
    <box border minHeight={composerHeight} height={composerHeight} flexShrink={0}>
      <textarea
        ref={ref}
        padding={1}
        width="100%"
        height="100%"
        wrapMode="word"
        focused
        onSubmit={() => {
          if (ref.current) {
            const value = ref.current.plainText;
            onSubmit(value);
            ref.current.clear();
          }
        }}
        keyBindings={[
          { name: "return", action: "submit" },
          { name: "enter", action: "submit" },
          { name: "return", shift: true, action: "newline" },
          { name: "enter", shift: true, action: "newline" },
        ]}
        placeholder={isRunning ? "Agent is running..." : "Should we build something?"}
      />
    </box>
  );
}

function getComposerHeight({
  text,
  terminalWidth,
  minLines,
  maxLines,
  borderRows,
}: {
  text: string;
  terminalWidth: number;
  minLines: number;
  maxLines: number;
  borderRows: number;
}): number {
  const contentWidth = Math.max(10, terminalWidth - 4);
  const wrappedLines = countWrappedLines(text, contentWidth);
  const visibleLines = Math.min(maxLines, Math.max(minLines, wrappedLines));
  return visibleLines + borderRows;
}

function countWrappedLines(text: string, width: number): number {
  if (!text) return 1;

  return text.split("\n").reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length / width));
  }, 0);
}
