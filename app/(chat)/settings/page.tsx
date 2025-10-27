"use client";

import { useEffect, useState } from "react";
// import { toast } from "sonner";
import { ProviderCRUDTable } from "@/components/provider-crud-table";
import { DatabaseStats } from "@/components/settings-backup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageStats } from "@/components/usage-stats";
// import { getAllProviders } from "@/lib/provider-model-service";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set loading to false after component mounts since we're using local storage
    setIsLoading(false);
  }, []);

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
    <div className="container max-w-4xl px-8 py-8">
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
      </div>
    </div>
  );
}