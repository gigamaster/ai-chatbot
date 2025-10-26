"use client";

import { useCallback, useEffect, useState } from "react";
import { getAllAvailableProviders } from "@/lib/ai/providers";

export function ModelSelector() {
  const [providerInfo, setProviderInfo] = useState<{
    name: string;
    type: string;
    model: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAvailableProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      const providers = await getAllAvailableProviders();

      // Use the first provider if available
      if (providers.length > 0) {
        const firstProvider = providers[0];
        setProviderInfo({
          name: firstProvider.name,
          type: firstProvider.type,
          model: firstProvider.model,
        });
      } else {
        // No providers available
        setProviderInfo(null);
      }
    } catch (error) {
      console.error("Failed to load providers:", error);
      setProviderInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvailableProviders();
  }, [
    // Load available providers
    loadAvailableProviders,
  ]);

  // Don't render the selector until we have data to avoid hydration issues
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="loading-provider">
            Active AI Provider
          </label>
          <div
            className="rounded-md bg-muted p-2 text-sm"
            id="loading-provider"
          >
            Loading provider information...
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="loading-model">
            Model
          </label>
          <div className="rounded-md bg-muted p-2 text-sm" id="loading-model">
            Loading...
          </div>
        </div>

        <div className="pt-2 text-muted-foreground text-xs">
          Note: Add your first AI provider in the AI Providers section below.
        </div>
      </div>
    );
  }

  // If no providers are available
  if (!providerInfo) {
    return (
      <div className="space-y-4 py-8 text-center text-muted-foreground">
        <p>No AI providers configured yet.</p>
        <p className="text-sm">
          Add your first provider in the AI Providers section below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="font-medium text-sm" htmlFor="active-ai-provider">
          Active AI Provider
        </label>
        <div
          className="rounded-md bg-muted p-2 text-sm"
          id="active-ai-provider"
        >
          {providerInfo.name} {providerInfo.type === "custom" ? "(Custom)" : ""}
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-medium text-sm" htmlFor="model-info">
          Model
        </label>
        <div className="rounded-md bg-muted p-2 text-sm" id="model-info">
          {providerInfo.model}
        </div>
      </div>

      <div className="pt-2 text-muted-foreground text-xs">
        Note: Manage your AI providers in the AI Providers section below.
      </div>
    </div>
  );
}
