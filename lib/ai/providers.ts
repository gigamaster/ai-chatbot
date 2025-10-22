import { DEFAULT_CHAT_MODEL, getModelById } from "./models";

// Function to get all available providers (only saved providers)
// This completely removes built-in providers and simplifies validation
export const getAllAvailableProviders = async () => {
  try {
    console.log("=== DEBUG: getAllAvailableProviders called ===");
    // Get providers from the LLMService (only saved providers)
    const { getProviders } = await import("../llm-service");
    console.log("Imported getProviders function");

    const savedProviders = await getProviders();
    console.log(
      "DEBUG: Raw saved providers from database:",
      JSON.stringify(savedProviders, null, 2)
    );

    // Return all saved providers - no validation filtering
    // If they're saved, they should be available
    const result = savedProviders || [];
    console.log("DEBUG: Returning providers:", JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error("=== DEBUG: FAILED to load saved providers ===");
    console.error("Error:", error);
    console.error("Error stack:", error.stack);
    // Return empty array if there's an error
    return [];
  }
};

// Function to create a language model based on provider type using LLM.js
// Accepts either (providerId, modelId) or just (modelId) and infers provider.
export const createLanguageModel = async (
  providerOrModelId: string,
  maybeModelId?: string
) => {
  try {
    console.log("=== createLanguageModel called ===");
    let providerId: string;
    let modelId: string;

    if (maybeModelId) {
      providerId = providerOrModelId;
      modelId = maybeModelId;
    } else {
      modelId = providerOrModelId;
      // Instead of looking up provider by model ID, we need to find the provider that has this model
      const { getProviders } = await import("../llm-service");
      const allProviders = await getProviders();
      const provider = allProviders.find((p: any) => p.model === modelId);

      if (provider) {
        providerId = provider.id;
      } else {
        // Fallback to default provider lookup
        const modelInfo = getModelById(modelId);
        providerId = modelInfo?.provider || "google"; // Default to google if not found
      }
    }
    console.log("Provider:", providerId);
    console.log("Model:", modelId);

    // Get provider configuration from LLMService (only saved providers)
    const { getProviderConfig } = await import("../llm-service");
    const providerConfig = await getProviderConfig(providerId);

    // Create LLM.js instance with provider configuration
    // All providers use the generic OpenAI interface with base URL and API key
    const options: any = {
      service: "openai", // Use generic OpenAI service for all providers
      model: modelId,
      stream: true,
    };

    // Add provider configuration if available
    if (providerConfig) {
      // Add API key if available
      if (providerConfig.apiKey) {
        options.apiKey = providerConfig.apiKey;
      }

      // Add base URL if available
      if (providerConfig.baseUrl) {
        options.baseUrl = providerConfig.baseUrl;
      }
    }

    console.log(
      "Creating LLM with generic OpenAI options:",
      JSON.stringify(options, null, 2)
    );
    // Dynamically import LLM to avoid immediate instantiation
    const LLMModule = await import("@themaximalist/llm.js");
    const LLM = LLMModule.default;
    const llm = new LLM(options);
    return llm;
  } catch (error: any) {
    console.error("=== FAILED to create language model ===");
    console.error("Error:", error);
    console.error("Error stack:", error.stack);
    throw new Error(`Failed to create language model: ${error.message}`);
  }
};

// Function to get a language model for immediate use
export const getLanguageModel = async (modelType = "default") => {
  try {
    console.log("=== getLanguageModel called ===");
    console.log("Model type:", modelType);
    console.log("typeof window:", typeof window);

    // TODO: get modelId from modelType, and fallback to DEFAULT_CHAT_MODEL
    let modelId: string = modelType;
    if (modelType === "default") {
      modelId = DEFAULT_CHAT_MODEL;
    }

    // Create the language model using the determined modelId
    const languageModel = await createLanguageModel(modelId);
    return languageModel;
  } catch (error: any) {
    console.error("=== FAILED to get language model ===");
    console.error("Error:", error);
    console.error("Error stack:", error.stack);
    throw new Error(
      "Failed to get language model. Please check your provider configuration."
    );
  }
};

// Function to get model name for specific purposes (maintains compatibility)
export const getModelNameForPurpose = (
  purpose: string,
  userConfiguredModel: string
) => {
  // For all purposes, we use the user's configured model to maintain simplicity
  // This ensures compatibility while avoiding the complexity of multiple model types
  return userConfiguredModel;
};
