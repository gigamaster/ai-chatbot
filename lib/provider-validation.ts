// Validation utilities for AI provider configurations

export interface ProviderValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a custom provider configuration
 * @param providerConfig - The provider configuration to validate
 * @returns Validation result with isValid flag and error messages
 */
export function validateCustomProvider(providerConfig: any): ProviderValidationResult {
  const errors: string[] = [];
  
  // Validate required fields
  if (!providerConfig.name || providerConfig.name.trim() === '') {
    errors.push('Provider name is required');
  }
  
  if (!providerConfig.baseUrl || providerConfig.baseUrl.trim() === '') {
    errors.push('Base URL is required');
  } else if (!isValidUrl(providerConfig.baseUrl)) {
    errors.push('Base URL must be a valid URL');
  }
  
  if (!providerConfig.apiKey || providerConfig.apiKey.trim() === '') {
    errors.push('API key is required');
  }
  
  // Validate provider type
  const validProviderTypes = ['openai-compatible', 'google-ai', 'custom'];
  if (!providerConfig.providerType || !validProviderTypes.includes(providerConfig.providerType)) {
    errors.push('Provider type must be one of: openai-compatible, google-ai, custom');
  }
  
  // Validate models (optional but should be valid if provided)
  if (providerConfig.defaultModels) {
    if (providerConfig.defaultModels.chatModel && typeof providerConfig.defaultModels.chatModel !== 'string') {
      errors.push('Chat model must be a string');
    }
    
    if (providerConfig.defaultModels.reasoningModel && typeof providerConfig.defaultModels.reasoningModel !== 'string') {
      errors.push('Reasoning model must be a string');
    }
    
    if (providerConfig.defaultModels.titleModel && typeof providerConfig.defaultModels.titleModel !== 'string') {
      errors.push('Title model must be a string');
    }
    
    if (providerConfig.defaultModels.artifactModel && typeof providerConfig.defaultModels.artifactModel !== 'string') {
      errors.push('Artifact model must be a string');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a URL string
 * @param url - The URL to validate
 * @returns True if the URL is valid, false otherwise
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Tests the connection to a provider
 * @param providerConfig - The provider configuration to test
 * @returns Promise that resolves to true if connection is successful, false otherwise
 */
export async function testProviderConnection(providerConfig: any): Promise<boolean> {
  try {
    // For now, we'll just validate the configuration
    // In a real implementation, this would make an actual API call
    const validation = validateCustomProvider(providerConfig);
    
    if (!validation.isValid) {
      return false;
    }
    
    // For OpenAI-compatible providers, we could test the /models endpoint
    if (providerConfig.providerType === 'openai-compatible') {
      // This is a placeholder - in a real implementation, we would make an actual API call
      // const response = await fetch(`${providerConfig.baseUrl}/models`, {
      //   headers: {
      //     'Authorization': `Bearer ${providerConfig.apiKey}`,
      //     'Content-Type': 'application/json'
      //   }
      // });
      // return response.ok;
      
      // For now, just return true if validation passes
      return true;
    }
    
    // For other provider types, return true if validation passes
    return true;
  } catch (error) {
    console.error('Error testing provider connection:', error);
    return false;
  }
}