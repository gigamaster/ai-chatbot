"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllAvailableProviders } from "@/lib/ai/providers";

export function ModelSelector() {
  const [providerInfo, setProviderInfo] = useState<{
    name: string;
    type: string;
    models: {
      chat: string;
      reasoning: string;
      title: string;
      artifact: string;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load available providers
    loadAvailableProviders();
  }, []);

  const loadAvailableProviders = async () => {
    try {
      setIsLoading(true);
      const providers = await getAllAvailableProviders();
      
      // Use the first provider if available
      if (providers.length > 0) {
        const firstProvider = providers[0];
        setProviderInfo({
          name: firstProvider.name,
          type: firstProvider.type,
          models: {
            chat: firstProvider.models.chatModel,
            reasoning: firstProvider.models.reasoningModel,
            title: firstProvider.models.titleModel,
            artifact: firstProvider.models.artifactModel,
          }
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
  };

  // Don't render the selector until we have data to avoid hydration issues
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Active AI Provider</label>
          <div className="text-sm p-2 bg-muted rounded-md">
            Loading provider information...
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Chat Model</label>
          <div className="text-sm p-2 bg-muted rounded-md">
            Loading...
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Reasoning Model</label>
          <div className="text-sm p-2 bg-muted rounded-md">
            Loading...
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Title Model</label>
          <div className="text-sm p-2 bg-muted rounded-md">
            Loading...
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Artifact Model</label>
          <div className="text-sm p-2 bg-muted rounded-md">
            Loading...
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground pt-2">
          Note: Add your first AI provider in the AI Providers section below.
        </div>
      </div>
    );
  }

  // If no providers are available
  if (!providerInfo) {
    return (
      <div className="space-y-4 text-center py-8 text-muted-foreground">
        <p>No AI providers configured yet.</p>
        <p className="text-sm">Add your first provider in the AI Providers section below.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Active AI Provider</label>
        <div className="text-sm p-2 bg-muted rounded-md">
          {providerInfo.name} {providerInfo.type === "custom" ? "(Custom)" : ""}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Chat Model</label>
        <div className="text-sm p-2 bg-muted rounded-md">
          {providerInfo.models.chat}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Reasoning Model</label>
        <div className="text-sm p-2 bg-muted rounded-md">
          {providerInfo.models.reasoning}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Title Model</label>
        <div className="text-sm p-2 bg-muted rounded-md">
          {providerInfo.models.title}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Artifact Model</label>
        <div className="text-sm p-2 bg-muted rounded-md">
          {providerInfo.models.artifact}
        </div>
      </div>

      <div className="text-xs text-muted-foreground pt-2">
        Note: Manage your AI providers in the AI Providers section below.
      </div>
    </div>
  );
}