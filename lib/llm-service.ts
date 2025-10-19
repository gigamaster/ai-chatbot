import { getServerProviders, setServerProviders } from './server-providers';

// Define types for our providers
export interface Provider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
}

// LLM.js service wrapper
export class LLMService {
  private llm: any;
  private providers: Provider[] = [];
  
  constructor() {
    // LLM instance will be created lazily when needed
    this.llm = null;
  }
  
  // Lazy initialization of LLM instance
  private async getLLM() {
    if (!this.llm) {
      // Dynamically import LLM to avoid immediate instantiation
      const LLMModule = await import('@themaximalist/llm.js');
      const LLM = LLMModule.default;
      this.llm = new LLM(); // Create a clean LLM instance
    }
    return this.llm;
  }

  // Initialize the service with user's providers from server storage
  async initialize() {
    try {
      const providers = getServerProviders();
      if (providers) this.providers = providers;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize LLM service:', error);
      return false;
    }
  }

  // Get available providers (only saved providers)
  getProviders() {
    return this.providers;
  }

  // Add or update a provider
  async addProvider(provider: Provider) {
    const existingIndex = this.providers.findIndex(p => p.id === provider.id);
    
    if (existingIndex >= 0) {
      this.providers[existingIndex] = provider;
    } else {
      this.providers.push(provider);
    }
    setServerProviders(this.providers);
  }

  // Remove a provider
  async removeProvider(providerId: string) {
    this.providers = this.providers.filter(p => p.id !== providerId);
    setServerProviders(this.providers);
  }

  // Send a message using the specified provider and model
  async sendMessage(message: string, providerId: string, modelId: string, systemPrompt?: string) {
    const provider = this.providers.find(p => p.id === providerId);
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    // Configure LLM.js with the provider settings
    // All providers use the generic OpenAI interface
    const options: any = {
      service: 'openai', // Use generic OpenAI service for all providers
      model: modelId,
      apiKey: provider.apiKey,
      stream: true,
    };
    
    // Add base URL if available
    if (provider.baseUrl) {
      options.baseUrl = provider.baseUrl;
    }
    
    // Get LLM instance lazily
    const llmInstance = await this.getLLM();
    
    // Set system prompt if provided
    if (systemPrompt) {
      llmInstance.system(systemPrompt);
    }
    
    // Send the message and return the streaming response
    return llmInstance.chat(message, options);
  }
  
  // Get available models for a provider
  async getModels(providerId: string) {
    const provider = this.providers.find(p => p.id === providerId);
    if (!provider || !provider.model) return [];
    
    return [provider.model];
  }
}

// Create a singleton instance
export const llmService = new LLMService();

// Named exports for provider retrieval used by ai/providers.ts
export async function getProviders(): Promise<any[]> {
  // First try to get from server memory
  const serverProviders = getServerProviders();
  if (serverProviders && serverProviders.length > 0) {
    return serverProviders;
  }
  
  // If server memory is empty, try to get from IndexedDB
  try {
    const { getAllProviders } = await import('@/lib/provider-model-service');
    const indexedDBProviders = await getAllProviders();
    return indexedDBProviders || [];
  } catch (error) {
    console.error("Failed to get providers from IndexedDB:", error);
    return [];
  }
}

export async function saveProviders(_userId: string, providers: any[]) {
  setServerProviders(providers);
  return true;
}

export async function getProviderConfig(providerId: string) {
  const providers = getServerProviders() || [];
  const provider = providers.find((p: any) => p.id === providerId);
  
  // Fix Google base URL to ensure it has the correct format
  if (provider && provider.baseUrl && provider.baseUrl.includes('generativelanguage.googleapis.com')) {
    // Ensure it has the correct base URL for Google OpenAI-compatible endpoint
    if (!provider.baseUrl.endsWith('/v1beta/openai')) {
      provider.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
    }
    // Remove any trailing slash if present
    if (provider.baseUrl.endsWith('/')) {
      provider.baseUrl = provider.baseUrl.slice(0, -1);
    }
  }
  
  return provider || null;
}

export default llmService;