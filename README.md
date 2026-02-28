# Nanoha - Nano sized Agent Harness

Nanoha is a compact TypeScript agent harness built on Bun and the Vercel AI SDK.

## Development

Install dependencies:

```bash
bun install
```

Run the app locally (expects a prompt argument):

```bash
bun run index.ts "Describe the task you want the agent to do"
```

If you run without a prompt, the process exits and prints:

```text
Usage: bun index.ts <prompt>
```

### Prompt development

Prompt templates live in `src/prompts/index.ts`. Update the system/planning/summary prompts there when iterating on agent behavior. The runtime injects the environment and file tree into the system prompt automatically (see `buildSystemPrompt`).

This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

Copyright © 2026 Julius Rajala. Licensed under the MIT License.