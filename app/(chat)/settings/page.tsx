"use client";

import { useState, useEffect } from "react";
import { ProviderCRUDTable as ProviderCrudTable } from "@/components/provider-crud-table";
import { UsageStats } from "@/components/usage-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAllCustomProviders } from "@/lib/local-db-queries";

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
      const providers = await getAllCustomProviders();
      
      // Send providers to server-side storage
      const response = await fetch("/api/set-providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(providers),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success("Settings saved successfully!");
      } else {
        toast.error("Failed to save settings: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your AI model preferences and application settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AI Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <ProviderCrudTable />
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
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}