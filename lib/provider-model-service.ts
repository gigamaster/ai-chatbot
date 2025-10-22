import { testProviderConnection } from "@/lib/client-test-provider";
import {
  deleteCustomProvider,
  getAllCustomProviders,
  getCustomProvider,
  saveCustomProvider,
} from "@/lib/local-db-queries";

// Define types - using 'enabled' for consistency with UI, but mapping to 'isEnabled' for database
export interface ProviderModel {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  enabled: boolean; // Using 'enabled' for UI consistency
}

// Internal type for database operations
interface DatabaseProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  isEnabled: boolean; // Database uses 'isEnabled'
}

// Get all available providers
export async function getAllProviders(): Promise<ProviderModel[]> {
  try {
    const providers = await getAllCustomProviders();
    // Map database field 'isEnabled' to interface field 'enabled'
    const result = (providers || []).map((provider: DatabaseProvider) => ({
      ...provider,
      enabled: provider.isEnabled,
    }));
    return result;
  } catch (error) {
    console.error("Failed to get providers:", error);
    return [];
  }
}

// Get a specific provider by ID
export async function getProviderById(
  providerId: string
): Promise<ProviderModel | null> {
  try {
    const provider = await getCustomProvider(providerId);
    if (!provider) return null;
    // Map database field 'isEnabled' to interface field 'enabled'
    return {
      ...provider,
      enabled: (provider as DatabaseProvider).isEnabled,
    };
  } catch (error) {
    console.error(`Failed to get provider ${providerId}:`, error);
    return null;
  }
}

// Save a provider
export async function saveProvider(provider: ProviderModel): Promise<boolean> {
  try {
    // Map interface field 'enabled' to database field 'isEnabled'
    const providerToSave = {
      ...provider,
      isEnabled: provider.enabled,
    };
    await saveCustomProvider(providerToSave);
    return true;
  } catch (error) {
    console.error("Failed to save provider:", error);
    return false;
  }
}

// Delete a provider
export async function deleteProvider(providerId: string): Promise<boolean> {
  try {
    await deleteCustomProvider(providerId);
    return true;
  } catch (error) {
    console.error(`Failed to delete provider ${providerId}:`, error);
    return false;
  }
}

// Test a provider connection
export async function testProvider(
  provider: ProviderModel
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const result = await testProviderConnection(provider);
    return result;
  } catch (error) {
    console.error("Failed to test provider:", error);
    return {
      success: false,
      error: "An unexpected error occurred while testing the provider",
    };
  }
}

// Get models for a provider (for now, just return the single model)
export async function getModelsForProvider(
  providerId: string
): Promise<string[]> {
  const provider = await getProviderById(providerId);
  if (provider) {
    return [provider.model];
  }
  return [];
}

// Find provider by model name
export async function findProviderByModel(
  modelName: string
): Promise<ProviderModel | null> {
  const providers = await getAllProviders();
  const provider = providers.find((p) => p.model === modelName);
  return provider || null;
}

// Get provider-model pairs for UI display
export async function getProviderModelPairs(): Promise<
  Array<{
    id: string;
    name: string;
    modelName: string;
    providerName: string;
    providerId: string;
  }>
> {
  const providers = await getAllProviders();
  const enabledProviders = providers.filter((provider) => provider.enabled);
  const result = enabledProviders.map((provider) => ({
    id: `provider-model-${provider.id}`,
    name: `${provider.name} - ${provider.model}`,
    modelName: provider.model,
    providerName: provider.name,
    providerId: provider.id,
  }));
  return result;
}
