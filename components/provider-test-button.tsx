"use client";

import { CheckIcon, PlayIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { testProviderConnection } from "@/lib/client-test-provider";

export function ProviderTestButton({
  provider,
  disabled = false,
}: {
  provider: any;
  disabled?: boolean;
}) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const handleTest = async () => {
    if (!provider) {
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const testResult = await testProviderConnection(provider);
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
        disabled={disabled || testing}
        onClick={handleTest}
        size="sm"
        variant="outline"
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
    </div>
  );
}
