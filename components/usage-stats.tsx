"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { tokenUsageService as telemetry } from "../lib/ai/token-usage";
import { getUserPreferences, setPreference } from "@/lib/user-preferences-service";

export function UsageStats() {
  const [usageStats, setUsageStats] = useState({
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    byModel: {} as Record<
      string,
      { requests: number; tokens: number; cost: number }
    >,
  });
  
  const [enableDataStreamUsage, setEnableDataStreamUsage] = useState(true);

  useEffect(() => {
    // Get initial usage stats
    const loadUsageStats = async () => {
      const stats = await telemetry.getUsageStats();
      setUsageStats(stats);
    };
    loadUsageStats();

    // Update stats every 5 seconds
    const interval = setInterval(() => {
      loadUsageStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      const preferences = await getUserPreferences();
      setEnableDataStreamUsage(preferences.enableDataStreamUsage);
    };
    
    loadPreferences();
  }, []);

  const handleToggleChange = async (checked: boolean) => {
    setEnableDataStreamUsage(checked);
    await setPreference("enableDataStreamUsage", checked);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{usageStats.totalRequests}</div>
          <div className="text-muted-foreground text-sm">Total Requests</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">
            {usageStats.totalInputTokens.toLocaleString()}
          </div>
          <div className="text-muted-foreground text-sm">Input Tokens</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">
            {usageStats.totalOutputTokens.toLocaleString()}
          </div>
          <div className="text-muted-foreground text-sm">Output Tokens</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">
            ${usageStats.totalCost.toFixed(6)}
          </div>
          <div className="text-muted-foreground text-sm">Estimated Cost</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Preferences</CardTitle>
          <p className="text-muted-foreground text-sm">
            Control how usage data is collected and displayed
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="data-stream-usage" className="font-medium">
                Enable Data Stream Provider Usage
              </Label>
              <p className="text-muted-foreground text-sm">
                When enabled, detailed token usage data will be collected and displayed
              </p>
            </div>
            <Switch
              id="data-stream-usage"
              checked={enableDataStreamUsage}
              onCheckedChange={handleToggleChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model Usage</CardTitle>
          <p className="text-muted-foreground text-sm">
            All usage data is stored locally on your device and never sent to
            any server.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(usageStats.byModel).length > 0 ? (
              Object.entries(usageStats.byModel).map(([modelId, stats]) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3"
                  key={modelId}
                >
                  <div className="font-medium">{modelId}</div>
                  <div className="flex gap-4 text-muted-foreground text-sm">
                    <span>{stats.requests} requests</span>
                    <span>{stats.tokens.toLocaleString()} tokens</span>
                    <span>${stats.cost.toFixed(6)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                No model usage data yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}