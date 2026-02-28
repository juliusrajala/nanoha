import { generateText as _generateText, streamText as _streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI();
const model = openai("gpt-5.1-codex-mini");

export const generateText: OmitModelParam<typeof _generateText> = (params) =>
  _generateText({ ...params, model } as any);

export const streamText: OmitModelParam<typeof _streamText> = (params) =>
  _streamText({ ...params, model } as any);

type OmitModelParam<T extends (params: any) => any> = (
  params: Omit<Parameters<T>[0], "model">
) => ReturnType<T>;
