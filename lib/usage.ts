// Define simple types since we don't have them in our custom AI package
type LanguageModelUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type UsageData = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

// Server-merged usage: base usage + TokenLens summary + optional modelId
export type AppUsage = LanguageModelUsage & UsageData & { modelId?: string };
