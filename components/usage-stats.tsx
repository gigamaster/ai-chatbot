"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { telemetry } from "@/lib/ai/telemetry";

export function UsageStats() {
  const [usageStats, setUsageStats] = useState({
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    byModel: {} as Record<string, { requests: number; tokens: number; cost: number }>
  });

  useEffect(() => {
    // Get initial usage stats
    const stats = telemetry.getUsageStats();
    setUsageStats(stats);
    
    // Update stats every 5 seconds
    const interval = setInterval(() => {
      const updatedStats = telemetry.getUsageStats();
      setUsageStats(updatedStats);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-2xl font-bold">{usageStats.totalRequests}</div>
          <div className="text-sm text-muted-foreground">Total Requests</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-2xl font-bold">{usageStats.totalInputTokens.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Input Tokens</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-2xl font-bold">{usageStats.totalOutputTokens.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Output Tokens</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-2xl font-bold">${usageStats.totalCost.toFixed(6)}</div>
          <div className="text-sm text-muted-foreground">Estimated Cost</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(usageStats.byModel).length > 0 ? (
              Object.entries(usageStats.byModel).map(([modelId, stats]) => (
                <div key={modelId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="font-medium">{modelId}</div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{stats.requests} requests</span>
                    <span>{stats.tokens.toLocaleString()} tokens</span>
                    <span>${stats.cost.toFixed(6)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No model usage data yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}