"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllProviders, getProviderModelPairs } from "@/lib/provider-model-service";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

interface ProviderModelOption {
  id: string;
  name: string;
  modelName: string;
  providerName: string;
  providerId: string;
}

export function ProviderModelSelector({
  value,
  onValueChange,
  placeholder = "Select provider model",
  disabled = false,
}: {
  value?: string;
  onValueChange?: (providerId: string, modelName: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [providerModels, setProviderModels] = useState<ProviderModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProviderModels = async () => {
    try {
      setLoading(true);
      console.log("Loading provider model pairs...");
      const pairs = await getProviderModelPairs();
      console.log("Provider model pairs loaded:", pairs.length);
      setProviderModels(pairs);
    } catch (error) {
      console.error("Failed to load provider models:", error);
      toast.error("Failed to load provider models");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviderModels();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProviderModels();
    setRefreshing(false);
  };

  const selectedOption = providerModels.find(option => option.providerId === value);

  if (loading) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select
        value={selectedOption?.providerId || ""}
        onValueChange={(providerId) => {
          console.log("Provider selected:", providerId);
          const option = providerModels.find(opt => opt.providerId === providerId);
          if (option) {
            console.log("Provider option found:", {
              providerId: option.providerId,
              modelName: option.modelName
            });
            onValueChange?.(option.providerId, option.modelName);
          } else {
            console.log("Provider option not found for ID:", providerId);
          }
        }}
        disabled={disabled || providerModels.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {selectedOption ? selectedOption.name : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {providerModels.length === 0 ? (
            <SelectItem value="__empty__" disabled>
              No providers configured
            </SelectItem>
          ) : (
            providerModels.map((option) => (
              <SelectItem key={option.id} value={option.providerId}>
                <div className="flex flex-col">
                  <span>{option.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.providerName}
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={handleRefresh}
        disabled={refreshing}
      >
        <RefreshCwIcon 
          className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} 
        />
      </Button>
    </div>
  );
}