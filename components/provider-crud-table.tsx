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
} from "@/lib/local-db";
import { nanoid } from "nanoid";

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

export function ProviderCrudTable() {
  const [providers, setProviders] = useState<CustomProviderConfig[]>([]);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<CustomProviderConfig | null>(null);
  
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
        <h3 className="text-lg font-medium">AI Providers</h3>
        <Button onClick={handleAddProvider}>Add Provider</Button>
      </div>

      {isAddingProvider ? (
        <div className="border rounded-lg p-4 mb-4">
          <h4 className="text-md font-medium mb-3">
            {editingProvider ? "Edit Provider" : "Add New Provider"}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name">Provider Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Groq, Hugging Face"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="baseUrl">Base URL *</Label>
                <Input
                  id="baseUrl"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com/v1"
                />
              </div>
              
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="apiKey">API Key *</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                />
              </div>
              
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="model">Model (Optional)</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g., llama3-8b-8192"
                />
              </div>
              
              <div className="space-y-1 md:col-span-2 flex items-center">
                <Switch
                  id="isEnabled"
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
                <Label htmlFor="isEnabled" className="ml-2">
                  Enabled
                </Label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingProvider ? "Update Provider" : "Add Provider"}
              </Button>
            </div>
          </form>
        </div>
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
                <TableCell className="text-right space-x-2">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <p className="font-medium">No AI providers configured</p>
          <p className="mt-2 text-sm">Add your first OpenAI-compatible provider to get started.</p>
          <p className="mt-1 text-xs">Examples: Groq, Hugging Face, OpenRouter, DeepSeek, etc.</p>
          <div className="mt-4">
            <Button onClick={handleAddProvider}>Add Provider</Button>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground pt-2">
        Note: All providers must be OpenAI API compatible. Add at least one provider to use the AI features.
      </div>
    </div>
  );
}