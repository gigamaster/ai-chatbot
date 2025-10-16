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
    console.log("getAllAvailableProviders called");
    // First try to get providers from the database
    const customProviders = await getAllCustomProviders();
    console.log("Custom providers from database:", customProviders);
    const enabledProviders = customProviders.filter((p: any) => p.isEnabled);
    console.log("Enabled providers from database:", enabledProviders);
    
    // If no providers found in database, try server-side providers
    if (enabledProviders.length === 0) {
      console.log("No enabled providers from database, checking server providers");
      const serverProviders = getServerProviders();
      console.log("Server providers:", serverProviders);
      const enabledServerProviders = serverProviders.filter((p: any) => p.isEnabled);
      console.log("Enabled server providers:", enabledServerProviders);
      return enabledServerProviders;
    }
    
    // Only include custom providers from database
    const providers: Array<{
      id: string;
      name: string;
      type: string;
      model: string;
      baseUrl?: string;
      apiKey?: string;
      isEnabled?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }> = [];
    
    // Add custom providers with all required fields
    for (const customProvider of enabledProviders) {
      providers.push({
        id: customProvider.id,
        name: customProvider.name,
        type: "custom",
        model: customProvider.model || "default-model",
        baseUrl: customProvider.baseUrl,
        apiKey: customProvider.apiKey,
        isEnabled: customProvider.isEnabled,
        createdAt: customProvider.createdAt,
        updatedAt: customProvider.updatedAt,
      });
    }
    
    console.log("Returning providers:", providers);
    return providers;
  } catch (error) {
    console.error("Failed to load providers:", error);
    // Return server-side providers as fallback
    try {
      console.log("Trying server providers as fallback");
      const serverProviders = getServerProviders();
      console.log("Server providers as fallback:", serverProviders);
      const enabledServerProviders = serverProviders.filter((p: any) => p.isEnabled);
      console.log("Enabled server providers as fallback:", enabledServerProviders);
      return enabledServerProviders;
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
    console.log("=== createLanguageModel called ===");
    console.log("Model name:", modelName);
    
    const customProviders = await getAllCustomProviders();
    console.log("Custom providers:", customProviders);
    
    const enabledProviders = customProviders.filter((p: any) => p.isEnabled);
    console.log("Enabled providers:", enabledProviders);
    
    let provider;
    if (enabledProviders.length > 0) {
      // Use provider from database
      provider = enabledProviders[0];
      console.log("Using provider from database:", provider);
    } else {
      // Fallback to server-side providers
      console.log("Checking server providers...");
      const serverProviders = getServerProviders();
      console.log("Server providers:", serverProviders);
      
      const enabledServerProviders = serverProviders.filter((p: any) => p.isEnabled);
      console.log("Enabled server providers:", enabledServerProviders);
      
      if (enabledServerProviders.length > 0) {
        provider = enabledServerProviders[0];
        console.log("Using provider from server storage:", provider);
      } else {
        console.log("ERROR: No providers available");
        throw new Error("No AI provider configured. Please add a provider in Settings > AI Providers.");
      }
    }
    
    // Validate provider structure
    if (!provider || !provider.baseUrl || !provider.apiKey) {
      console.log("ERROR: Provider missing required fields:", provider);
      throw new Error("Provider configuration is incomplete. Please check your provider settings.");
    }
    
    console.log("Provider validated:", {
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      hasApiKey: !!provider.apiKey,
      model: provider.model
    });
    
    // Check if this is a Google Gemini provider
    if (provider.baseUrl.includes('generativelanguage.googleapis.com')) {
      console.log("Creating Google Generative AI provider");
      // Create Google provider with API key
      const googleProvider = createGoogleGenerativeAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl
      });
      // Use the exact model name saved by the user
      console.log("Creating Google language model with model name:", modelName);
      return googleProvider.languageModel(modelName);
    } else {
      console.log("Creating OpenAI-compatible provider");
      // For OpenAI-compatible providers, create a direct connection
      const openaiProvider = createOpenAICompatible({
        name: provider.name || 'openai-compatible',
        baseURL: provider.baseUrl,
        apiKey: provider.apiKey,
      });
      // Use the exact model name saved by the user
      console.log("Creating OpenAI-compatible language model with model name:", modelName);
      console.log("Provider details:", {
        name: provider.name,
        baseURL: provider.baseUrl,
        hasApiKey: !!provider.apiKey
      });
      return openaiProvider.languageModel(modelName);
    }
  } catch (error: any) {
    console.error("=== FAILED to create language model ===");
    console.error("Error:", error);
    console.error("Error stack:", error.stack);
    throw new Error("Failed to create language model. Please check your provider configuration.");
  }
};

// Function to get a language model for immediate use
export const getLanguageModel = async (modelType: string = "default") => {
  try {
    console.log("=== getLanguageModel called ===");
    console.log("Model type:", modelType);
    
    const customProviders = await getAllCustomProviders();
    console.log("Custom providers in getLanguageModel:", customProviders);
    
    const enabledProviders = customProviders.filter((p: any) => p.isEnabled);
    console.log("Enabled providers in getLanguageModel:", enabledProviders);
    
    let provider;
    if (enabledProviders.length > 0) {
      // Use provider from database
      provider = enabledProviders[0];
      console.log("Using provider from database in getLanguageModel:", provider);
    } else {
      // Fallback to server-side providers
      console.log("Checking server providers in getLanguageModel...");
      const serverProviders = getServerProviders();
      console.log("Server providers in getLanguageModel:", serverProviders);
      
      const enabledServerProviders = serverProviders.filter((p: any) => p.isEnabled);
      console.log("Enabled server providers in getLanguageModel:", enabledServerProviders);
      
      if (enabledServerProviders.length > 0) {
        provider = enabledServerProviders[0];
        console.log("Using provider from server storage in getLanguageModel:", provider);
      } else {
        console.log("ERROR: No providers available in getLanguageModel");
        throw new Error("No AI provider configured. Please add a provider in Settings > AI Providers.");
      }
    }
    
    // Validate provider structure
    if (!provider || !provider.baseUrl || !provider.apiKey) {
      console.log("ERROR: Provider missing required fields in getLanguageModel:", provider);
      throw new Error("Provider configuration is incomplete. Please check your provider settings.");
    }
    
    // For compatibility, we map all model types to the user's configured model
    const modelName = provider.model || "default-model";
    console.log("Using model name:", modelName);
    
    // Check if this is a Google Gemini provider
    if (provider.baseUrl.includes('generativelanguage.googleapis.com')) {
      console.log("Creating Google Generative AI provider in getLanguageModel");
      // Create Google provider with API key
      const googleProvider = createGoogleGenerativeAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl
      });
      // Use the exact model name saved by the user
      console.log("Creating Google language model with model name:", modelName);
      return googleProvider.languageModel(modelName);
    } else {
      console.log("Creating OpenAI-compatible provider in getLanguageModel");
      // For OpenAI-compatible providers, create a direct connection
      const openaiProvider = createOpenAICompatible({
        name: provider.name || 'openai-compatible',
        baseURL: provider.baseUrl,
        apiKey: provider.apiKey,
      });
      // Use the exact model name saved by the user
      console.log("Creating OpenAI-compatible language model with model name:", modelName);
      return openaiProvider.languageModel(modelName);
    }
  } catch (error: any) {
    console.error("=== FAILED to get language model ===");
    console.error("Error:", error);
    console.error("Error stack:", error.stack);
    throw new Error("Failed to get language model. Please check your provider configuration.");
  }
};

// Function to get model name for specific purposes (maintains compatibility)
export const getModelNameForPurpose = (purpose: string, userConfiguredModel: string) => {
  // For all purposes, we use the user's configured model to maintain simplicity
  // This ensures compatibility while avoiding the complexity of multiple model types
  return userConfiguredModel;
};