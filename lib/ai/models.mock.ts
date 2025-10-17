import type { LanguageModel } from "@/lib/custom-ai";

const createMockModel = (name: string = "mock-model"): LanguageModel => {
  return {
    specificationVersion: "v2",
    provider: "mock",
    modelId: name,
    defaultObjectGenerationMode: "tool",
    supportedUrls: [],
    supportsImageUrls: false,
    supportsStructuredOutputs: false,
    doGenerate: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: "stop",
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      content: [{ type: "text", text: `Mock response from ${name}` }],
      warnings: [],
    }),
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "text-delta",
            id: "mock-id",
            delta: `Mock streaming response from ${name}`,
          });
          controller.close();
        },
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  } as unknown as LanguageModel;
};

// Enhanced mock models with more realistic responses for development
export const chatModel = createMockModel("chat-model");
export const reasoningModel = createMockModel("reasoning-model");
export const titleModel = createMockModel("title-model");
export const artifactModel = createMockModel("artifact-model");

// Helper function for testing different scenarios
export const createCustomMockModel = (responses: string[]) => {
  let responseIndex = 0;
  
  return {
    specificationVersion: "v2",
    provider: "mock",
    modelId: "custom-mock-model",
    defaultObjectGenerationMode: "tool",
    supportedUrls: [],
    supportsImageUrls: false,
    supportsStructuredOutputs: false,
    doGenerate: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: "stop",
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      content: [{ type: "text", text: responses[responseIndex++ % responses.length] }],
      warnings: [],
    }),
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "text-delta",
            id: "mock-id",
            delta: responses[responseIndex++ % responses.length],
          });
          controller.close();
        },
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  } as unknown as LanguageModel;
};