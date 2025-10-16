"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestGeminiPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testGemini = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    
    try {
      const response = await fetch("/api/test-gemini");
      const data = await response.json();
      
      if (response.ok) {
        setResult(data.text);
      } else {
        setError(data.error || "Failed to test Google Gemini");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to test endpoint");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Test Google Gemini Integration</h1>
          <p className="text-muted-foreground">
            Verify that your Google Gemini provider is properly configured
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Google Gemini Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              This test will send a simple request to Google Gemini to verify the integration is working.
            </p>
            
            <Button 
              onClick={testGemini} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Testing..." : "Test Google Gemini"}
            </Button>
            
            {result && (
              <div className="p-4 bg-muted rounded-md">
                <h3 className="font-medium mb-2">Response:</h3>
                <p className="text-sm">{result}</p>
              </div>
            )}
            
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-md">
                <h3 className="font-medium mb-2">Error:</h3>
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground pt-4">
              <p className="font-medium">To configure Google Gemini:</p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Go to Settings &gt; AI Providers</li>
                <li>Click "Add Provider"</li>
                <li>Enter provider details:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Name: Google Gemini</li>
                    <li>Base URL: https://generativelanguage.googleapis.com/v1beta</li>
                    <li>API Key: Your Google AI Studio key</li>
                    <li>Model: gemini-1.5-flash</li>
                    <li>Enable the provider</li>
                  </ul>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}