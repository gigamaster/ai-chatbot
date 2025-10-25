"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProviderCRUDTable } from "@/components/provider-crud-table";
import { DatabaseStats } from "@/components/settings-backup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageStats } from "@/components/usage-stats";
import { getAllProviders } from "@/lib/provider-model-service";

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set loading to false after component mounts since we're using local storage
    setIsLoading(false);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get all providers from local database
      const providers = await getAllProviders();

      // For GitHub Pages deployment, this runs entirely client-side using IndexedDB
      // Providers are stored exclusively in per-user IndexedDB

      toast.success(
        "Settings saved successfully! Providers are stored locally in your browser."
      );
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error(
        "Failed to save settings: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-3xl">Settings</h1>
          <p className="text-muted-foreground">
            Configure your AI model preferences and application settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AI Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <ProviderCRUDTable />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <DatabaseStats />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Information</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageStats />
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button disabled={isSaving} onClick={handleSave}>
            {isSaving ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
