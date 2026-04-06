# Nanoha - Nano sized Agent Harness

Nanoha is a compact TypeScript agent harness built on Bun and the Vercel AI SDK.

## Development

Install dependencies:

```bash
bun install
```

Run the app locally with a prompt:

```bash
bun run index.ts "Describe the task you want the agent to do"
```

Run without a prompt to open the TUI:

```bash
bun run index.ts
```

### Prompt development

Prompt templates live in `src/agent/prompts.ts`. Update the system prompt there when iterating on agent behavior. The runtime injects the environment and file tree into the system prompt automatically (see `buildSystemPrompt`).

This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## License

Copyright © 2026 Julius Rajala. Licensed under the MIT License.
