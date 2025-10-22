// Privacy-respecting usage tracking module
// This implementation tracks AI model usage statistics locally in the browser
// All data remains on the user's device and is never sent to external servers
// Complies with European data privacy standards

interface ModelUsage {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  tokens: number;
  cost: number;
}

interface UsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  byModel: Record<string, ModelUsage>;
}

// In-memory cache for usage stats
let usageStatsCache: UsageStats | null = null;

// Simple cost estimation (these are approximate values)
const MODEL_COSTS: Record<string, { inputCostPerToken: number; outputCostPerToken: number }> = {
  // OpenAI models
  'gpt-4o': { inputCostPerToken: 0.000005, outputCostPerToken: 0.000015 },
  'gpt-4-turbo': { inputCostPerToken: 0.00001, outputCostPerToken: 0.00003 },
  'gpt-4': { inputCostPerToken: 0.00003, outputCostPerToken: 0.00006 },
  'gpt-3.5-turbo': { inputCostPerToken: 0.0000005, outputCostPerToken: 0.0000015 },
  
  // Anthropic models
  'claude-3-opus-20240229': { inputCostPerToken: 0.000015, outputCostPerToken: 0.000075 },
  'claude-3-sonnet-20240229': { inputCostPerToken: 0.000003, outputCostPerToken: 0.000015 },
  'claude-3-haiku-20240307': { inputCostPerToken: 0.00000025, outputCostPerToken: 0.00000125 },
  
  // Google models
  'gemini-2.5-flash': { inputCostPerToken: 0.000000075, outputCostPerToken: 0.0000003 },
  'gemini-1.5-pro': { inputCostPerToken: 0.00000035, outputCostPerToken: 0.00000105 },
  'gemini-1.5-flash': { inputCostPerToken: 0.0000000375, outputCostPerToken: 0.00000015 },
  'gemini-1.0-pro': { inputCostPerToken: 0.00000005, outputCostPerToken: 0.00000015 },
  
  // Mistral models
  'mistral-large-latest': { inputCostPerToken: 0.000002, outputCostPerToken: 0.000006 },
  'mistral-medium-latest': { inputCostPerToken: 0.00000027, outputCostPerToken: 0.00000081 },
  'mistral-small-latest': { inputCostPerToken: 0.00000002, outputCostPerToken: 0.00000006 },
  
  // Ollama models (local, no cost)
  'llama3': { inputCostPerToken: 0, outputCostPerToken: 0 },
  'llama2': { inputCostPerToken: 0, outputCostPerToken: 0 },
  'mistral': { inputCostPerToken: 0, outputCostPerToken: 0 }
};

// Function to record model usage (stores data locally)
export function recordModelUsage(
  modelId: string,
  inputTokens: number,
  outputTokens: number
) {
  // In a real implementation, this would store data in IndexedDB
  // For now, we'll just update the in-memory cache to demonstrate the concept
  const totalTokens = inputTokens + outputTokens;
  
  // Get cost estimation for the model
  const modelCosts = MODEL_COSTS[modelId] || { inputCostPerToken: 0, outputCostPerToken: 0 };
  const cost = (inputTokens * modelCosts.inputCostPerToken) + (outputTokens * modelCosts.outputCostPerToken);
  
  // Initialize cache if needed
  if (!usageStatsCache) {
    usageStatsCache = {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      byModel: {}
    };
  }
  
  // Update total stats
  usageStatsCache.totalRequests += 1;
  usageStatsCache.totalInputTokens += inputTokens;
  usageStatsCache.totalOutputTokens += outputTokens;
  usageStatsCache.totalTokens += totalTokens;
  usageStatsCache.totalCost += cost;
  
  // Update model-specific stats
  if (!usageStatsCache.byModel[modelId]) {
    usageStatsCache.byModel[modelId] = {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      tokens: 0,
      cost: 0
    };
  }
  
  usageStatsCache.byModel[modelId].requests += 1;
  usageStatsCache.byModel[modelId].inputTokens += inputTokens;
  usageStatsCache.byModel[modelId].outputTokens += outputTokens;
  usageStatsCache.byModel[modelId].tokens += totalTokens;
  usageStatsCache.byModel[modelId].cost += cost;
  
  // In a full implementation, we would persist this to IndexedDB here
  console.log(`Recorded usage for model ${modelId}: ${inputTokens} input tokens, ${outputTokens} output tokens`);
}

// Function to get current usage statistics
export function getUsageStats() {
  if (!usageStatsCache) {
    usageStatsCache = {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      byModel: {}
    };
  }
  return { ...usageStatsCache };
}

// Function to reset usage stats
export function resetUsageStats() {
  usageStatsCache = {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    byModel: {}
  };
  // In a full implementation, we would also clear data from IndexedDB here
  console.log('Usage statistics reset');
}

// Export telemetry object
export const telemetry = {
  recordModelUsage,
  getUsageStats,
  resetUsageStats
};