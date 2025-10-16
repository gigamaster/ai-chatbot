import { gateway } from "@ai-sdk/gateway";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";
import { telemetry, estimateCost } from "./telemetry";
import { getAllCustomProviders } from "../local-db";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Provider configuration types
type ProviderConfig = {
  chatModel: string;
  reasoningModel: string;
  titleModel: string;
  artifactModel: string;
};

// Default provider configurations (empty by default)
const providerConfigs: Record<string, ProviderConfig> = {
  // No default providers - users must add their own
};

// Get provider from environment or return empty config
const getProviderConfig = (): ProviderConfig => {
  // Return empty config instead of defaulting to XAI
  return {
    chatModel: "",
    reasoningModel: "",
    titleModel: "",
    artifactModel: "",
  };
};

// Create a mock language model that throws an error when used
const createErrorLanguageModel = (errorMessage: string) => {
  // Return an object that matches the LanguageModelV2 interface but throws errors when used
  return {
    specificationVersion: 'v2' as const,
    provider: 'error-provider',
    modelId: 'error-model',
    defaultObjectGenerationMode: 'json' as const,
    supportsImageUrls: false,
    supportedUrls: {},
    generate: async () => {
      throw new Error(errorMessage);
    },
    doGenerate: async () => {
      throw new Error(errorMessage);
    },
    doStream: async () => {
      throw new Error(errorMessage);
    }
  };
};

// Create provider based on environment and configuration
const createProvider = () => {
  if (isTestEnvironment) {
    const {
      artifactModel,
      chatModel,
      reasoningModel,
      titleModel,
    } = require("./models.mock");
    return customProvider({
      languageModels: {
        "chat-model": chatModel,
        "chat-model-reasoning": reasoningModel,
        "title-model": titleModel,
        "artifact-model": artifactModel,
      },
    });
  }

  const config = getProviderConfig();
  
  // Check if we have valid model configurations
  const hasValidConfig = config.chatModel || config.reasoningModel || config.titleModel || config.artifactModel;
  
  if (!hasValidConfig) {
    // Return a provider with mock models when no valid configuration is available
    return customProvider({
      languageModels: {
        "chat-model": createErrorLanguageModel("No AI provider configured. Please add a provider in Settings > AI Providers."),
        "chat-model-reasoning": createErrorLanguageModel("No AI provider configured. Please add a provider in Settings > AI Providers."),
        "title-model": createErrorLanguageModel("No AI provider configured. Please add a provider in Settings > AI Providers."),
        "artifact-model": createErrorLanguageModel("No AI provider configured. Please add a provider in Settings > AI Providers."),
      },
    });
  }
  
  // Use the configured models
  return customProvider({
    languageModels: {
      "chat-model": gateway.languageModel(config.chatModel),
      "chat-model-reasoning": wrapLanguageModel({
        model: gateway.languageModel(config.reasoningModel),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      }),
      "title-model": gateway.languageModel(config.titleModel),
      "artifact-model": gateway.languageModel(config.artifactModel),
    },
  });
};

export const myProvider = createProvider();

// Helper function to get model information for UI display
export const getModelInfo = () => {
  // Return empty/default values instead of defaulting to XAI
  return {
    provider: "",
    models: {
      chat: "",
      reasoning: "",
      title: "",
      artifact: "",
    },
  };
};

// Wrapper function to track model usage
export const trackModelUsage = (
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  totalTokens: number
) => {
  const modelInfo = getModelInfo();
  const cost = estimateCost(modelId, inputTokens, outputTokens);
  
  telemetry.trackUsage({
    modelId,
    provider: modelInfo.provider,
    inputTokens,
    outputTokens,
    totalTokens,
    cost,
  });
};

// Function to get all available providers (including custom ones)
export const getAllAvailableProviders = async () => {
  try {
    const customProviders = await getAllCustomProviders();
    const enabledProviders = customProviders.filter((p: any) => p.isEnabled);
    
    // Only include custom providers, not the default XAI provider
    const providers: Array<{
      id: string;
      name: string;
      type: string;
      models: ProviderConfig;
    }> = [];
    
    // Add custom providers
    for (const customProvider of enabledProviders) {
      // Check if this is a Google Gemini provider
      if (customProvider.baseUrl.includes('generativelanguage.googleapis.com')) {
        // For Google Gemini, we'll use the Google provider
        const modelName = customProvider.model || 'gemini-1.5-pro';
        
        const customModels: ProviderConfig = {
          chatModel: modelName,
          reasoningModel: modelName,
          titleModel: modelName,
          artifactModel: modelName,
        };
        
        providers.push({
          id: customProvider.id,
          name: customProvider.name,
          type: "google",
          models: customModels
        });
      } else {
        // For other providers, we'll use the same model for all purposes
        const customModels: ProviderConfig = {
          chatModel: customProvider.model || "default-model",
          reasoningModel: customProvider.model || "default-model",
          titleModel: customProvider.model || "default-model",
          artifactModel: customProvider.model || "default-model",
        };
        
        providers.push({
          id: customProvider.id,
          name: customProvider.name,
          type: "custom",
          models: customModels
        });
      }
    }
    
    // If no custom providers, return an empty array
    return providers;
  } catch (error) {
    console.error("Failed to load providers:", error);
    // Return empty array if there's an error
    return [];
  }
};

// Function to create a language model based on provider type
export const createLanguageModel = async (modelName: string) => {
  try {
    const customProviders = await getAllCustomProviders();
    const enabledProviders = customProviders.filter((p: any) => p.isEnabled);
    
    if (enabledProviders.length === 0) {
      throw new Error("No AI provider configured. Please add a provider in Settings > AI Providers.");
    }
    
    // Find the provider that matches the requested model
    // For now, we'll use the first enabled provider and assume the model name is correct
    const provider = enabledProviders[0];
    
    // Check if this is a Google Gemini provider
    if (provider.baseUrl.includes('generativelanguage.googleapis.com')) {
      // Create Google provider with API key
      const googleProvider = createGoogleGenerativeAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl
      });
      // Use the provided model name
      return googleProvider.languageModel(modelName);
    } else {
      // For other providers, use the gateway
      // We need to construct the model ID in the format expected by the gateway
      const modelId = `${provider.baseUrl}|${provider.apiKey}|${modelName}`;
      return gateway.languageModel(modelId);
    }
  } catch (error) {
    console.error("Failed to create language model:", error);
    throw new Error("Failed to create language model. Please check your provider configuration.");
  }
};