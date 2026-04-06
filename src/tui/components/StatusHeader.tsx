/** @jsxImportSource @opentui/react */

export function StatusHeader({ status }: { status: string }) {
  return (
    <>
      <text>🦚 Nanoha Agent (TUI)</text>
      <text fg="#999999">Status: {status}</text>
      <text fg="#666666">Tip: Enter submits. Shift+Enter inserts a new line.</text>
    </>
  );
}
