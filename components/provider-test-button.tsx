"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { testProvider } from "@/lib/provider-model-service";
import { toast } from "sonner";
import { CheckIcon, XIcon, PlayIcon } from "lucide-react";

export function ProviderTestButton({
  provider,
  disabled = false,
}: {
  provider: any;
  disabled?: boolean;
}) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const handleTest = async () => {
    if (!provider) return;
    
    setTesting(true);
    setResult(null);
    
    try {
      const testResult = await testProvider(provider);
      setResult(testResult);
      
      if (testResult.success) {
        toast.success(testResult.message || "Connection successful!");
      } else {
        toast.error(testResult.error || "Connection failed");
      }
    } catch (error) {
      console.error("Test error:", error);
      toast.error("An unexpected error occurred during testing");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleTest}
        disabled={disabled || testing}
      >
        {testing ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : result?.success ? (
          <CheckIcon className="h-4 w-4 text-green-500" />
        ) : result?.success === false ? (
          <XIcon className="h-4 w-4 text-red-500" />
        ) : (
          <PlayIcon className="h-4 w-4" />
        )}
        {testing ? "Testing..." : "Test Connection"}
      </Button>
      
      {result?.success === true && (
        <span className="text-sm text-green-600">Connected successfully</span>
      )}
      
      {result?.success === false && (
        <span className="text-sm text-red-600">
          {result.error || "Connection failed"}
        </span>
      )}
    </div>
  );
}