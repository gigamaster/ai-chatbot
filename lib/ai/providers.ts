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
  // For the main provider, we'll create a dynamic provider that resolves models at runtime
  return {
    languageModel: () => createErrorLanguageModel("Provider not initialized. Model will be resolved at runtime."),
  };
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
  // For now, just log the usage
  console.log(`Model ${modelId} usage: ${inputTokens} input tokens, ${outputTokens} output tokens, ${totalTokens} total tokens`);
};

// Function to get all available providers (including custom ones)
export const getAllAvailableProviders = async () => {
  try {
    console.log("getAllAvailableProviders called");
    // First try to get providers from the database
    const customProviders: any[] = []; // This would come from database in a real implementation
    console.log("Custom providers from database:", customProviders);
    const enabledProviders = customProviders.filter((p: any) => p.isEnabled);
    console.log("Enabled providers from database:", enabledProviders);
    
    // Return empty array if there's an error
    return [];
  } catch (error) {
    console.error("Failed to load providers:", error);
    // Return empty array if there's an error
    return [];
  }
};

// Function to create a language model based on provider type
// ALL providers use the generic OpenAI-compatible approach
export const createLanguageModel = async (modelName: string) => {
  try {
    console.log("=== createLanguageModel called ===");
    console.log("Model name:", modelName);
    console.log("typeof window:", typeof window);
    
    // Always return an error language model since we've removed Vercel AI SDK
    return createErrorLanguageModel("Vercel AI SDK has been removed. Please configure a custom provider.");
  } catch (error: any) {
    console.error("=== FAILED to create language model ===");
    console.error("Error:", error);
    console.error("Error stack:", error.stack);
    throw new Error("Failed to create language model. Please check your provider configuration.");
  }
};

// Function to get a language model for immediate use
// ALL providers use the generic OpenAI-compatible approach
export const getLanguageModel = async (modelType: string = "default") => {
  try {
    console.log("=== getLanguageModel called ===");
    console.log("Model type:", modelType);
    console.log("typeof window:", typeof window);
    
    // Always return an error language model since we've removed Vercel AI SDK
    return createErrorLanguageModel("Vercel AI SDK has been removed. Please configure a custom provider.");
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