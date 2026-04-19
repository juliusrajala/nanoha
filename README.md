# Nanoha - Nano sized Agent Harness

Nanoha is a compact TypeScript agent harness built on Bun and the Vercel AI SDK.

## Requirements

- Bun
- An OpenAI-compatible API endpoint (OpenAI by default, LM Studio supported)

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

### Use with LM Studio

Nanoha now supports OpenAI-compatible local endpoints like LM Studio.

Start LM Studio's local server, then set:

```bash
export LMSTUDIO_BASE_URL="http://127.0.0.1:1234/v1"
```

Optional:

- `LMSTUDIO_MODEL` if you want to force a specific model id
- `OPENAI_API_KEY` if your local endpoint requires one (Nanoha defaults to `lm-studio` for localhost endpoints)
- `LLM_MODEL` or `OPENAI_MODEL` as an alternative way to override the model id
- `LLM_API` to force request format (`chat` for OpenAI Chat Completions, `responses` for OpenAI Responses API)

If `LMSTUDIO_MODEL`/`LLM_MODEL`/`OPENAI_MODEL` are unset, Nanoha auto-reads `/models` from your endpoint and uses the first returned model id.

Nanoha automatically uses `chat` mode for non-OpenAI base URLs so local open-model servers can use tools reliably.

### Command execution

Nanoha includes a `runCommand` tool for shell commands.

- By default, each command requires interactive approval.
- CLI prompt mode shows a `[y/N]` prompt in terminal.
- TUI mode shows an in-app approval panel (press `Y` or `N`).
- Run with `--yolo` to skip approvals.

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

# Eval Testing
