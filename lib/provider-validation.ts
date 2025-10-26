// Validation utilities for AI provider configurations

export type ProviderValidationResult = {
  isValid: boolean;
  errors: string[];
};

/**
 * Validates a custom provider configuration
 * @param providerConfig - The provider configuration to validate
 * @returns Validation result with isValid flag and error messages
 */
export function validateCustomProvider(
  providerConfig: any
): ProviderValidationResult {
  const errors: string[] = [];

  // Validate required fields
  if (!providerConfig.name || providerConfig.name.trim() === "") {
    errors.push("Provider name is required");
  }

  if (!providerConfig.baseUrl || providerConfig.baseUrl.trim() === "") {
    errors.push("Base URL is required");
  } else if (!isValidUrl(providerConfig.baseUrl)) {
    errors.push("Base URL must be a valid URL");
  }

  if (!providerConfig.apiKey || providerConfig.apiKey.trim() === "") {
    errors.push("API key is required");
  }

  // Validate provider type - ONLY allow openai-compatible for generic approach
  const validProviderTypes = ["openai-compatible", "custom"];
  if (
    !providerConfig.providerType ||
    !validProviderTypes.includes(providerConfig.providerType)
  ) {
    errors.push("Provider type must be one of: openai-compatible, custom");
  }

  // Validate models (optional but should be valid if provided)
  if (providerConfig.defaultModels) {
    if (
      providerConfig.defaultModels.chatModel &&
      typeof providerConfig.defaultModels.chatModel !== "string"
    ) {
      errors.push("Chat model must be a string");
    }
    if (
      providerConfig.defaultModels.reasoningModel &&
      typeof providerConfig.defaultModels.reasoningModel !== "string"
    ) {
      errors.push("Reasoning model must be a string");
    }
    if (
      providerConfig.defaultModels.titleModel &&
      typeof providerConfig.defaultModels.titleModel !== "string"
    ) {
      errors.push("Title model must be a string");
    }
    if (
      providerConfig.defaultModels.artifactModel &&
      typeof providerConfig.defaultModels.artifactModel !== "string"
    ) {
      errors.push("Artifact model must be a string");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates if a string is a valid URL
 * @param urlString - The string to validate
 * @returns True if valid URL, false otherwise
 */
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch (_e) {
    return false;
  }
}
