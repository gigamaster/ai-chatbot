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
import { getServerProviders } from "../server-providers";

// Provider configuration types
type ProviderConfig = {
  // Use a single model for all purposes to support generic OpenAI endpoints
  model: string;
};

// Get provider from environment or return empty config
const getProviderConfig = (): ProviderConfig => {
  // Return empty config instead of defaulting to XAI
  return {
    model: "",
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
        "default-model": chatModel,
      },
    });
  }

  // For the main provider, we'll create a dynamic provider that resolves models at runtime
  return customProvider({
    languageModels: {
      "default-model": createErrorLanguageModel("Provider not initialized. Model will be resolved at runtime."),
    },
  });
};

// myProvider is no longer used - models are resolved dynamically

// Helper function to get model information for UI display
export const getModelInfo = () => {
  // Return empty/default values instead of defaulting to XAI
  return {
    provider: "",
    model: "",
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
    // First try to get providers from the database
    const customProviders = await getAllCustomProviders();
    const enabledProviders = customProviders.filter((p: any) => p.isEnabled);
    
    // If no providers found in database, try server-side providers
    if (enabledProviders.length === 0) {
      const serverProviders = getServerProviders();
      return serverProviders.filter((p: any) => p.isEnabled);
    }
    
    // Only include custom providers from database
    const providers: Array<{
      id: string;
      name: string;
      type: string;
      model: string;
    }> = [];
    
    // Add custom providers
    for (const customProvider of enabledProviders) {
      providers.push({
        id: customProvider.id,
        name: customProvider.name,
        type: "custom",
        model: customProvider.model || "default-model",
      });
    }
    
    return providers;
  } catch (error) {
    console.error("Failed to load providers:", error);
    // Return server-side providers as fallback
    try {
      const serverProviders = getServerProviders();
      return serverProviders.filter((p: any) => p.isEnabled);
    } catch (serverError) {
      console.error("Failed to load server providers:", serverError);
      // Return empty array if there's an error
      return [];
    }
  }
};

// Function to create a language model based on provider type
export const createLanguageModel = async (modelName: string) => {
  try {
    const customProviders = await getAllCustomProviders();
    const enabledProviders = customProviders.filter((p: any) => p.isEnabled);
    
    let provider;
    if (enabledProviders.length > 0) {
      // Use provider from database
      provider = enabledProviders[0];
    } else {
      // Fallback to server-side providers
      const serverProviders = getServerProviders();
      const enabledServerProviders = serverProviders.filter((p: any) => p.isEnabled);
      if (enabledServerProviders.length > 0) {
        provider = enabledServerProviders[0];
      } else {
        throw new Error("No AI provider configured. Please add a provider in Settings > AI Providers.");
      }
    }
    
    // Check if this is a Google Gemini provider
    if (provider.baseUrl.includes('generativelanguage.googleapis.com')) {
      // Create Google provider with API key
      const googleProvider = createGoogleGenerativeAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl
      });
      // Use the exact model name saved by the user
      return googleProvider.languageModel(modelName);
    } else {
      // For OpenAI-compatible providers, create a direct connection
      const openaiProvider = createOpenAICompatible({
        name: provider.name || 'openai-compatible',
        baseURL: provider.baseUrl,
        apiKey: provider.apiKey,
      });
      // Use the exact model name saved by the user
      return openaiProvider.languageModel(modelName);
    }
  } catch (error) {
    console.error("Failed to create language model:", error);
    throw new Error("Failed to create language model. Please check your provider configuration.");
  }
};

// Function to get a language model for immediate use
export const getLanguageModel = async (modelType: string = "default") => {
  try {
    const customProviders = await getAllCustomProviders();
    const enabledProviders = customProviders.filter((p: any) => p.isEnabled);
    
    let provider;
    if (enabledProviders.length > 0) {
      // Use provider from database
      provider = enabledProviders[0];
    } else {
      // Fallback to server-side providers
      const serverProviders = getServerProviders();
      const enabledServerProviders = serverProviders.filter((p: any) => p.isEnabled);
      if (enabledServerProviders.length > 0) {
        provider = enabledServerProviders[0];
      } else {
        throw new Error("No AI provider configured. Please add a provider in Settings > AI Providers.");
      }
    }
    
    // For compatibility, we map all model types to the user's configured model
    const modelName = provider.model || "default-model";
    
    // Check if this is a Google Gemini provider
    if (provider.baseUrl.includes('generativelanguage.googleapis.com')) {
      // Create Google provider with API key
      const googleProvider = createGoogleGenerativeAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl
      });
      // Use the exact model name saved by the user
      return googleProvider.languageModel(modelName);
    } else {
      // For OpenAI-compatible providers, create a direct connection
      const openaiProvider = createOpenAICompatible({
        name: provider.name || 'openai-compatible',
        baseURL: provider.baseUrl,
        apiKey: provider.apiKey,
      });
      // Use the exact model name saved by the user
      return openaiProvider.languageModel(modelName);
    }
  } catch (error) {
    console.error("Failed to get language model:", error);
    throw new Error("Failed to get language model. Please check your provider configuration.");
  }
};

// Function to get model name for specific purposes (maintains compatibility)
export const getModelNameForPurpose = (purpose: string, userConfiguredModel: string) => {
  // For all purposes, we use the user's configured model to maintain simplicity
  // This ensures compatibility while avoiding the complexity of multiple model types
  return userConfiguredModel;
};