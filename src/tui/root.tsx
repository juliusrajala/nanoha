/** @jsxImportSource @opentui/react */

import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { NanohaTui } from "./components/NanohaTui";
import type { AgentSession } from "../main";

export async function renderRoot(session: AgentSession) {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
  });

  createRoot(renderer).render(<NanohaTui session={session} />);
}
