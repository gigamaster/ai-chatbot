import { MockLanguageModelV2 } from "@/lib/custom-ai";

export const chatModel = new MockLanguageModelV2({
  modelId: "chat-model",
});

export const reasoningModel = new MockLanguageModelV2({
  modelId: "reasoning-model",
});

export const titleModel = new MockLanguageModelV2({
  modelId: "title-model",
});

export const artifactModel = new MockLanguageModelV2({
  modelId: "artifact-model",
});
