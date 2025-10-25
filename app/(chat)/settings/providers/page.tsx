"use client";

import { Loader2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { testProviderConnection } from "@/lib/client-test-provider";
import {
  deleteCustomProvider,
  getAllCustomProviders,
  saveCustomProvider,
} from "@/lib/local-db";
import { getCustomProvider } from "@/lib/local-db-queries";

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

export default function ProviderManagementPage() {
  const [providers, setProviders] = useState<CustomProviderConfig[]>([]);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [editingProvider, setEditingProvider] =
    useState<CustomProviderConfig | null>(null);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(
    null
  );
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string; error?: string }>
  >({});

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
    setApiKey(provider.apiKey); // Note: In a real implementation, we wouldn't show the API key
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
      toast.success(
        editingProvider
          ? "Provider updated successfully"
          : "Provider added successfully"
      );
      resetForm();
      loadProviders(); // Refresh the list
    } catch (error) {
      console.error("Failed to save provider:", error);
      toast.error("Failed to save provider");
    }
  };

  const handleTestProvider = async (provider: CustomProviderConfig) => {
    setTestingProviderId(provider.id);

    try {
      // Use client-side test function instead of API call
      const result = await testProviderConnection(provider);

      setTestResults((prev) => ({
        ...prev,
        [provider.id]: {
          success: result.success,
          message: result.message || "",
          error: result.error,
        },
      }));

      if (result.success) {
        toast.success(`Connection successful for ${provider.name}`);
      } else {
        toast.error(`Connection failed for ${provider.name}: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to test provider:", error);
      toast.error(`Failed to test provider ${provider.name}`);
      setTestResults((prev) => ({
        ...prev,
        [provider.id]: {
          success: false,
          message: "Test failed",
          error: "Internal error",
        },
      }));
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleTestNewProvider = async () => {
    // Create a temporary provider object with current form values
    const tempProvider: CustomProviderConfig = {
      id: editingProvider?.id || "new",
      name,
      baseUrl,
      apiKey,
      model,
      createdAt: editingProvider?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: true,
    };

    setTestingProviderId(tempProvider.id);

    try {
      // Use client-side test function instead of API call
      const result = await testProviderConnection(tempProvider);

      setTestResults((prev) => ({
        ...prev,
        [tempProvider.id]: {
          success: result.success,
          message: result.message || "",
          error: result.error,
        },
      }));

      if (result.success) {
        toast.success(`Connection successful for ${name}`);
      } else {
        toast.error(`Connection failed for ${name}: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to test provider:", error);
      toast.error(`Failed to test provider ${name}`);
    } finally {
      setTestingProviderId(null);
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-3xl">AI Provider Management</h1>
          <p className="text-muted-foreground">
            Configure and manage your AI providers
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AI Providers</CardTitle>
            <CardDescription>
              Add, edit, and manage your AI providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                {providers.length} provider{providers.length !== 1 ? "s" : ""}{" "}
                configured
              </div>
              <Button onClick={handleAddProvider}>Add Provider</Button>
            </div>

            {isAddingProvider ? (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>
                    {editingProvider ? "Edit Provider" : "Add New Provider"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Provider Name *</Label>
                        <Input
                          id="name"
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g., Groq, Hugging Face"
                          value={name}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="baseUrl">Base URL *</Label>
                        <Input
                          id="baseUrl"
                          onChange={(e) => setBaseUrl(e.target.value)}
                          placeholder="e.g., https://api.groq.com/openai/v1"
                          value={baseUrl}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="apiKey">API Key *</Label>
                        <Input
                          id="apiKey"
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Enter your API key"
                          type="password"
                          value={apiKey}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="model">Model (Optional)</Label>
                        <Input
                          id="model"
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="e.g., llama3-8b-8192"
                          value={model}
                        />
                      </div>

                      <div className="flex items-center space-y-2 md:col-span-2">
                        <Switch
                          checked={isEnabled}
                          id="isEnabled"
                          onCheckedChange={setIsEnabled}
                        />
                        <Label className="ml-2" htmlFor="isEnabled">
                          Enabled
                        </Label>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button
                        onClick={resetForm}
                        type="button"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          disabled={
                            !name ||
                            !baseUrl ||
                            !apiKey ||
                            testingProviderId === "new"
                          }
                          onClick={() => handleTestNewProvider()}
                          type="button"
                          variant="default"
                        >
                          {testingProviderId === "new" ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            "Test Connection"
                          )}
                        </Button>
                        <Button type="submit">
                          {editingProvider ? "Update Provider" : "Add Provider"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
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
                      <TableCell className="font-normal">
                        {provider.name}
                      </TableCell>
                      <TableCell>{provider.model || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {provider.baseUrl}
                      </TableCell>
                      <TableCell>
                        {provider.isEnabled ? (
                          <Badge variant="default">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                        {testResults[provider.id] && (
                          <div className="mt-1">
                            {testResults[provider.id].success ? (
                              <Badge className="text-xs" variant="default">
                                Connected
                              </Badge>
                            ) : (
                              <Badge className="text-xs" variant="destructive">
                                Failed
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button className="mr-2 h-4 w-4 animate-spin">
                            MyButton
                          </Button>
                          <Button
                            disabled={testingProviderId === provider.id}
                            onClick={() => handleTestProvider(provider)}
                            size="sm"
                            variant="outline"
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
                            onClick={() => handleEditProvider(provider)}
                            size="sm"
                            variant="outline"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteProvider(provider.id)}
                            size="sm"
                            variant="outline"
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
              <div className="py-8 text-center text-muted-foreground">
                <p>No providers configured yet.</p>
                <p className="mt-2">Add your first provider to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
