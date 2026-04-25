# Nanoha

Nanoha is a compact TypeScript agent harness built on Bun and the Vercel AI SDK.

It is designed to be easy to run locally, easy to hack on, and easy to extend with new tools, prompts, and eval cases.

## What it can do

- Run an agent from the command line or in a TUI
- Talk to OpenAI-compatible APIs, including local servers like LM Studio
- Approve shell commands interactively before they run
- Evaluate behavior against built-in proof cases

## Requirements

- Bun
- An OpenAI-compatible API endpoint
  - OpenAI works by default
  - LM Studio and other local compatible servers are supported

## Getting started

Install dependencies:

```bash
bun install
```

Run the agent with a one-off prompt:

```bash
bun run index.ts "Describe the task you want the agent to do"
```

Or start the TUI:

```bash
bun run index.ts
```

### Configuration

Nanoha reads its LLM settings from environment variables.

Common options:

- `OPENAI_API_KEY` — your API key for OpenAI or another compatible provider
- `OPENAI_BASE_URL` — override the API base URL
- `OPENAI_MODEL` — choose the model to use
- `LLM_MODEL` — alternate model override
- `LLM_API` — force request format: `chat` or `responses`

### Using LM Studio

To use LM Studio, start its local server and point Nanoha at it:

```bash
export LMSTUDIO_BASE_URL="http://127.0.0.1:1234/v1"
```

Optional overrides:

- `LMSTUDIO_MODEL` to force a specific model id
- `OPENAI_API_KEY` if your local endpoint requires one
- `LLM_MODEL` or `OPENAI_MODEL` to override the model id
- `LLM_API` to force request format

If no model is specified, Nanoha can read `/models` from the endpoint and use the first returned model id.

For non-OpenAI base URLs, Nanoha defaults to `chat` mode so local tool-enabled models behave reliably.

### Shell command approval

Nanoha includes a `runCommand` tool for shell commands.

- Commands require interactive approval by default
- In CLI mode, approval is shown as a `[y/N]` prompt
- In TUI mode, approval is shown in-app; press `Y` or `N`
- Use `--yolo` to skip approval prompts entirely

## Project layout

A few useful places to start:

- `src/agent/prompts.ts` — system prompt and agent instructions
- `src/tools/` — tool implementations
- `src/lsp/` — diagnostics and language-server plumbing
- `src/tui/` — TUI components
- `lib/eval/` — evaluation runner and proof cases

## Development workflow

Recommended commands:

```bash
bun install
bun run index.ts
bun run ./lib/eval/eval.ts
```

If you're changing agent behavior, update `src/agent/prompts.ts` and add or adjust eval cases in `lib/eval/proofs.json`.

## Evaluations

Run a specific evaluation by id:

```bash
bun run ./lib/eval/eval.ts <evaluation-id>
```

List available evaluation ids and descriptions:

```bash
bun run ./lib/eval/eval.ts
```

Available evaluation cases live in `lib/eval/proofs.json`.

## Contributing

Contributions are welcome. If you're helping out, a good change usually includes:

- a focused code change
- updates to prompts or docs when behavior changes
- an eval case that demonstrates the new behavior when applicable

## License

Copyright © 2026 Julius Rajala. Licensed under the MIT License.


