// Simple telemetry system for tracking AI model usage
import { generateUUID } from "@/lib/utils";

export type ModelUsage = {
  id: string;
  modelId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  timestamp: Date;
  cost?: number;
};

class Telemetry {
  private usageData: ModelUsage[] = [];

  // Track model usage
  trackUsage(usage: Omit<ModelUsage, 'id' | 'timestamp'>) {
    const usageRecord: ModelUsage = {
      id: generateUUID(),
      timestamp: new Date(),
      ...usage,
    };
    
    this.usageData.push(usageRecord);
    
    // In a real implementation, this would send data to a backend service
    console.log("Model usage tracked:", usageRecord);
  }

  // Get usage statistics
  getUsageStats() {
    const stats = {
      totalRequests: this.usageData.length,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      byModel: {} as Record<string, { requests: number; tokens: number; cost: number }>,
    };

    for (const usage of this.usageData) {
      stats.totalInputTokens += usage.inputTokens;
      stats.totalOutputTokens += usage.outputTokens;
      stats.totalTokens += usage.totalTokens;
      stats.totalCost += usage.cost || 0;

      if (!stats.byModel[usage.modelId]) {
        stats.byModel[usage.modelId] = {
          requests: 0,
          tokens: 0,
          cost: 0,
        };
      }

      stats.byModel[usage.modelId].requests += 1;
      stats.byModel[usage.modelId].tokens += usage.totalTokens;
      stats.byModel[usage.modelId].cost += usage.cost || 0;
    }

    return stats;
  }

  // Clear usage data
  clearUsage() {
    this.usageData = [];
  }

  // Get recent usage
  getRecentUsage(limit: number = 10) {
    return this.usageData.slice(-limit).reverse();
  }
}

export const telemetry = new Telemetry();

// Helper function to estimate cost based on model and tokens
export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  // Simplified cost estimation - in a real implementation, this would use actual pricing
  const pricing: Record<string, { input: number; output: number }> = {
    // XAI models (per million tokens)
    "xai/grok-2-vision-1212": { input: 2.00, output: 10.00 },
    "xai/grok-3-mini": { input: 0.50, output: 2.50 },
    "xai/grok-2-1212": { input: 1.00, output: 5.00 },
    
    // Default fallback
    "default": { input: 0.10, output: 0.30 },
  };

  const modelPricing = pricing[modelId] || pricing.default;
  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
  
  return inputCost + outputCost;
}