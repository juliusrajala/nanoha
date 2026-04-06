# Nanoha - Nano sized Agent Harness

Nanoha is a compact TypeScript agent harness built on Bun and the Vercel AI SDK.

## Requirements

- Bun
- An OpenAI API key in your environment

## Development

Install dependencies:

```bash
bun install
```

Run the agent against a prompt:

```bash
bun run index.ts "Describe the task you want the agent to do"
```

Run without a prompt to open the TUI:

```bash
bun run index.ts
```

### Prompt development

Prompt templates live in `src/agent/prompts.ts`. Update the system prompt there when iterating on agent behavior. The runtime injects the current working directory and file tree into the system prompt automatically.

## Evaluations

The evaluation runner lives in `lib/eval/eval.ts` and can be used to check agent behavior against the built-in proofs.

Run a specific evaluation by id:

```bash
bun run ./lib/eval/eval.ts <evaluation-id>
```

List available evaluation ids and descriptions:

```bash
bun run ./lib/eval/eval.ts
```

You can find the available evaluation cases in `lib/eval/proofs.json`.

## License

Copyright © 2026 Julius Rajala. Licensed under the MIT License.
