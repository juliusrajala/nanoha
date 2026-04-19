export type ModelProvider = "openai" | "anthropic" | "local";

export interface ModelDefinition {
  id: string;
  provider: ModelProvider;
  maxTokens: number;
  streaming: boolean;
  matchers?: RegExp[];
}

export const KNOWN_MODELS: ModelDefinition[] = [
  {
    id: "gpt-5.4-mini",
    provider: "openai",
    maxTokens: 16384,
    streaming: true,
    matchers: [/^gpt-5/i],
  },
  { id: "gpt-5.1", provider: "openai", maxTokens: 16384, streaming: true },
  { id: "gpt-5", provider: "openai", maxTokens: 16384, streaming: true },
  { id: "gpt-4o", provider: "openai", maxTokens: 16384, streaming: true, matchers: [/^gpt-4o/i] },
  {
    id: "claude-sonnet-4-0",
    provider: "anthropic",
    maxTokens: 8192,
    streaming: true,
    matchers: [/^claude/i],
  },
  {
    id: "claude-opus-4-0",
    provider: "anthropic",
    maxTokens: 8192,
    streaming: true,
  },
  {
    id: "qwen/qwen3.6-35b-a3b",
    provider: "local",
    maxTokens: 65536,
    streaming: true,
    matchers: [/^qwen(\/|-)qwen3\.6-35b-a3b(?::\d+)?$/i, /^qwen[-/]3\.6/i],
  },
  {
    id: "gemini-1.5-pro",
    provider: "local",
    maxTokens: 8192,
    streaming: false,
    matchers: [/^gemini/i],
  },
];

const DEFAULT_MODEL_BY_PROVIDER: Record<ModelProvider, string> = {
  openai: "gpt-5.4-mini",
  anthropic: "claude-sonnet-4-0",
  local: "qwen/qwen3.6-35b-a3b",
};

const FALLBACK_MODEL: ModelDefinition = {
  id: "gpt-5.4-mini",
  provider: "openai",
  maxTokens: 16384,
  streaming: true,
};

export function resolveDefaultModelId(options: {
  preferLocal: boolean;
  providerOverride?: string;
}): string {
  const provider =
    normalizeProvider(options.providerOverride) ?? (options.preferLocal ? "local" : "openai");
  return DEFAULT_MODEL_BY_PROVIDER[provider];
}

export function resolveModelConfig(
  modelId: string,
  options: { preferLocal: boolean },
): ModelDefinition {
  const explicitMatch = KNOWN_MODELS.find((model) => model.id === modelId);
  if (explicitMatch) return explicitMatch;

  const matcherMatch = KNOWN_MODELS.find(
    (model) => model.matchers?.some((matcher) => matcher.test(modelId)) ?? false,
  );
  if (matcherMatch) {
    return {
      ...matcherMatch,
      id: modelId,
    };
  }

  const inferredProvider = inferProvider(modelId, options.preferLocal);
  const providerDefaultId = DEFAULT_MODEL_BY_PROVIDER[inferredProvider];
  const providerDefault = KNOWN_MODELS.find((model) => model.id === providerDefaultId);

  if (!providerDefault) {
    return {
      ...FALLBACK_MODEL,
      id: modelId,
    };
  }

  return {
    ...providerDefault,
    id: modelId,
  };
}

function inferProvider(modelId: string, preferLocal: boolean): ModelProvider {
  const normalizedModelId = modelId.trim().toLowerCase();
  if (!normalizedModelId) return preferLocal ? "local" : "openai";

  if (
    normalizedModelId.startsWith("qwen") ||
    normalizedModelId.startsWith("deepseek") ||
    normalizedModelId.startsWith("llama") ||
    normalizedModelId.startsWith("gemma") ||
    normalizedModelId === "model"
  ) {
    return "local";
  }

  if (normalizedModelId.startsWith("claude")) return "anthropic";
  if (
    normalizedModelId.startsWith("gpt") ||
    normalizedModelId.startsWith("o1") ||
    normalizedModelId.startsWith("o3")
  ) {
    return "openai";
  }

  return preferLocal ? "local" : "openai";
}

function normalizeProvider(provider: string | undefined): ModelProvider | undefined {
  const normalizedProvider = provider?.trim().toLowerCase();
  if (!normalizedProvider) return undefined;
  if (
    normalizedProvider === "openai" ||
    normalizedProvider === "anthropic" ||
    normalizedProvider === "local"
  ) {
    return normalizedProvider;
  }
  return undefined;
}
