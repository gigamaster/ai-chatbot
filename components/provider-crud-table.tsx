"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  saveCustomProvider, 
  getAllCustomProviders, 
  deleteCustomProvider,
  getCustomProvider
} from "@/lib/local-db-queries";
import { nanoid } from "nanoid";
import { Loader2 } from "lucide-react";

// Define the provider configuration type
interface CustomProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  isEnabled: boolean;
}

export function ProviderCRUDTable() {
  const [providers, setProviders] = useState<CustomProviderConfig[]>([]);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<CustomProviderConfig | null>(null);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  // Load providers on component mount
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const providerList = await getAllCustomProviders();
      setProviders(providerList);
    } catch (error) {
      console.error("Failed to load providers:", error);
      toast.error("Failed to load providers");
    }
  };

  const resetForm = () => {
    setName("");
    setBaseUrl("");
    setApiKey("");
    setModel("");
    setIsEnabled(true);
    setEditingProvider(null);
    setIsAddingProvider(false);
  };

  const handleAddProvider = () => {
    resetForm();
    setIsAddingProvider(true);
  };

  const handleEditProvider = (provider: CustomProviderConfig) => {
    setName(provider.name);
    setBaseUrl(provider.baseUrl);
    setApiKey(provider.apiKey);
    setModel(provider.model);
    setIsEnabled(provider.isEnabled);
    setEditingProvider(provider);
    setIsAddingProvider(true);
  };

  const handleDeleteProvider = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this provider?")) {
      try {
        await deleteCustomProvider(id);
        toast.success("Provider deleted successfully");
        loadProviders(); // Refresh the list
      } catch (error) {
        console.error("Failed to delete provider:", error);
        toast.error("Failed to delete provider");
      }
    }
  };

  const handleTestProvider = async (provider: CustomProviderConfig) => {
    setTestingProviderId(provider.id);
    
    try {
      // Validate required fields before testing
      if (!provider.baseUrl || !provider.apiKey) {
        toast.error("Base URL and API key are required for testing");
        return;
      }
      
      const response = await fetch("/api/test-provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(provider),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Connection successful for ${provider.name}`);
      } else {
        toast.error(`Connection failed for ${provider.name}: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to test provider:", error);
      toast.error(`Failed to test provider ${provider.name}`);
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!name || !baseUrl || !apiKey) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      const providerData: CustomProviderConfig = {
        id: editingProvider?.id || nanoid(),
        name,
        baseUrl,
        apiKey, // In a real implementation, this would be encrypted
        model,
        createdAt: editingProvider?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isEnabled,
      };
      
      await saveCustomProvider(providerData);
      toast.success(editingProvider ? "Provider updated successfully" : "Provider added successfully");
      resetForm();
      loadProviders(); // Refresh the list
    } catch (error) {
      console.error("Failed to save provider:", error);
      toast.error("Failed to save provider");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {providers.length} provider{providers.length !== 1 ? 's' : ''} configured
        </div>
        <Button onClick={handleAddProvider}>Add Provider</Button>
      </div>

      {isAddingProvider ? (
        <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
          <h3 className="text-lg font-medium">
            {editingProvider ? "Edit Provider" : "Add New Provider"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Provider Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., OpenAI, Google Gemini"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL *</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="e.g., https://api.openai.com/v1"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your API key"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Default Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., gpt-4, gemini-pro"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isEnabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
            <Label htmlFor="isEnabled">Enable this provider</Label>
          </div>
          
          <div className="flex space-x-2">
            <Button type="submit">
              {editingProvider ? "Update Provider" : "Add Provider"}
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              onClick={async () => {
                // Validate required fields before testing
                if (!name || !baseUrl || !apiKey) {
                  toast.error("Please fill in all required fields (Name, Base URL, and API Key) before testing");
                  return;
                }
                
                // Create a temporary provider object with current form values
                const tempProvider: CustomProviderConfig = {
                  id: editingProvider?.id || 'new',
                  name,
                  baseUrl,
                  apiKey,
                  model,
                  createdAt: editingProvider?.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  isEnabled: true,
                };
                
                try {
                  const response = await fetch("/api/test-provider", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(tempProvider),
                  });
                  
                  const result = await response.json();
                  
                  if (result.success) {
                    toast.success(`Connection successful for ${name}`);
                  } else {
                    toast.error(`Connection failed for ${name}: ${result.error}`);
                  }
                } catch (error) {
                  console.error("Failed to test provider:", error);
                  toast.error(`Failed to test provider ${name}`);
                }
              }}
              disabled={!name || !baseUrl || !apiKey}
            >
              Test Connection
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {providers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Base URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell className="font-medium">{provider.name}</TableCell>
                <TableCell>{provider.model || "-"}</TableCell>
                <TableCell className="max-w-xs truncate">{provider.baseUrl}</TableCell>
                <TableCell>
                  {provider.isEnabled ? (
                    <Badge variant="default">Enabled</Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestProvider(provider)}
                      disabled={testingProviderId === provider.id}
                    >
                      {testingProviderId === provider.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProvider(provider)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProvider(provider.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <p className="font-medium">No AI providers configured</p>
          <p className="mt-2 text-sm">Add your first OpenAI-compatible provider to get started.</p>
          <p className="mt-1 text-xs">Examples: OpenAI, Google Gemini, Groq, Hugging Face, OpenRouter, DeepSeek, etc.</p>
          <div className="mt-4">
            <Button onClick={handleAddProvider}>Add Provider</Button>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground pt-2">
        Note: All providers must be OpenAI API compatible and use the generic OpenAI-compatible interface. 
        This ensures compatibility with any provider that implements the OpenAI API standard.
      </div>
    </div>
  );
}