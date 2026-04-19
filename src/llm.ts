import { createOpenAI } from "@ai-sdk/openai";
import { resolveDefaultModelId, resolveModelConfig, type ModelDefinition } from "./config/llm";

const baseURL = process.env.LMSTUDIO_BASE_URL ?? process.env.OPENAI_BASE_URL;
const hasLocalEndpoint = isLikelyLocalBaseUrl(baseURL);
const apiKey = process.env.OPENAI_API_KEY ?? (hasLocalEndpoint ? "lm-studio" : undefined);

const providerConfig: { baseURL?: string; apiKey?: string } = {};

if (baseURL) {
  providerConfig.baseURL = baseURL;
}

if (apiKey) {
  providerConfig.apiKey = apiKey;
}

const openaiProvider =
  Object.keys(providerConfig).length > 0 ? createOpenAI(providerConfig) : createOpenAI();

export interface ResolvedModel {
  model: any;
  config: ModelDefinition;
}

const resolvedModel = await resolveDefaultModel();

export function getDefaultModel() {
  return resolvedModel.model;
}

export function getResolvedModelConfig(): ModelDefinition {
  return resolvedModel.config;
}

async function resolveDefaultModel(): Promise<ResolvedModel> {
  const explicitModelId =
    process.env.LLM_MODEL ?? process.env.LMSTUDIO_MODEL ?? process.env.OPENAI_MODEL;
  const providerOverride = process.env.LLM_PROVIDER;
  const modelId =
    explicitModelId ??
    (await resolveModelIdFromEndpoint()) ??
    resolveDefaultModelId({
      preferLocal: hasLocalEndpoint,
      providerOverride,
    });

  const config = resolveModelConfig(modelId, { preferLocal: hasLocalEndpoint });

  if (config.provider === "local" && !baseURL) {
    throw new Error(
      `Model "${config.id}" needs an OpenAI-compatible endpoint. Set LMSTUDIO_BASE_URL or OPENAI_BASE_URL.`,
    );
  }

  const modelApi = resolveModelApi(config);
  const model =
    modelApi === "chat" ? openaiProvider.chat(config.id) : openaiProvider.responses(config.id);

  return { model, config };
}

function resolveModelApi(config: ModelDefinition): "responses" | "chat" {
  const configured = process.env.LLM_API?.trim().toLowerCase();
  if (configured === "responses" || configured === "chat") return configured;

  if (config.provider === "local" || config.provider === "anthropic") return "chat";

  if (!baseURL) return "responses";

  try {
    const host = new URL(baseURL).host.toLowerCase();
    if (host === "api.openai.com") return "responses";
  } catch {
    return "chat";
  }

  return "chat";
}

async function resolveModelIdFromEndpoint(): Promise<string | undefined> {
  if (!baseURL) return undefined;

  try {
    const modelsUrl = `${baseURL.replace(/\/+$/, "")}/models`;
    const response = await fetch(modelsUrl, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      signal: AbortSignal.timeout(1500),
    });

    if (!response.ok) return undefined;

    const payload = await response.json();
    if (!payload || typeof payload !== "object" || !("data" in payload)) return undefined;
    if (!Array.isArray(payload.data) || payload.data.length === 0) return undefined;

    const first = payload.data[0];
    if (!first || typeof first !== "object" || !("id" in first)) return undefined;
    return typeof first.id === "string" && first.id.trim() ? first.id : undefined;
  } catch {
    return undefined;
  }
}

function isLikelyLocalBaseUrl(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return value.includes("localhost") || value.includes("127.0.0.1");
  }
}
