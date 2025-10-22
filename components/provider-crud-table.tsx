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
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel,
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Trash2, Pencil, Plus, TestTube } from "lucide-react";
import { toast } from "sonner";
import { 
  getAllProviders, 
  saveProvider, 
  deleteProvider,
  testProvider
} from "@/lib/provider-model-service";
import { ProviderTestButton } from "./provider-test-button";
import { generateUUID } from "@/lib/utils";

interface Provider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
}

export function ProviderCRUDTable() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState<Omit<Provider, "id"> & { id?: string }>({
    name: "",
    apiKey: "",
    baseUrl: "",
    model: "",
    enabled: true,
  });

  const loadProviders = async () => {
    try {
      setLoading(true);
      const providerList = await getAllProviders();
      setProviders(providerList);
    } catch (error) {
      console.error("Failed to load providers:", error);
      toast.error("Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleCreate = () => {
    setEditingProvider(null);
    setFormData({
      name: "",
      apiKey: "",
      baseUrl: "",
      model: "",
      enabled: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setFormData({
      id: provider.id,
      name: provider.name || "",
      apiKey: provider.apiKey || "",
      baseUrl: provider.baseUrl || "",
      model: provider.model || "",
      enabled: provider.enabled !== undefined ? provider.enabled : true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await deleteProvider(id);
      if (success) {
        toast.success("Provider deleted successfully");
        loadProviders();
      } else {
        toast.error("Failed to delete provider");
      }
    } catch (error) {
      console.error("Failed to delete provider:", error);
      toast.error("Failed to delete provider");
    }
  };

  const handleToggleEnabled = async (provider: Provider) => {
    try {
      const updatedProvider = {
        ...provider,
        enabled: !provider.enabled
      };
      
      const success = await saveProvider(updatedProvider);
      if (success) {
        toast.success(`Provider ${updatedProvider.enabled ? 'enabled' : 'disabled'} successfully`);
        loadProviders(); // Refresh the list
      } else {
        toast.error("Failed to update provider status");
      }
    } catch (error) {
      console.error("Failed to toggle provider status:", error);
      toast.error("Failed to update provider status");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const providerData: Provider = {
        id: editingProvider?.id || generateUUID(),
        name: formData.name || "",
        apiKey: formData.apiKey || "",
        baseUrl: formData.baseUrl || "",
        model: formData.model || "",
        enabled: formData.enabled !== undefined ? formData.enabled : true,
      };
      
      const success = await saveProvider(providerData);
      if (success) {
        toast.success(editingProvider ? "Provider updated successfully" : "Provider created successfully");
        // Load providers first to confirm save, then close dialog
        await loadProviders();
        setIsDialogOpen(false);
      } else {
        toast.error("Failed to save provider");
      }
    } catch (error) {
      console.error("Failed to save provider:", error);
      toast.error("Failed to save provider");
    }
  };

  if (loading) {
    return <div>Loading providers...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium">AI Providers</h3>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>
      
      <div className="rounded-md border">
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
                <TableCell>{provider.model}</TableCell>
                <TableCell>{provider.baseUrl}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={() => handleToggleEnabled(provider)}
                    />
                    <span className={provider.enabled ? "text-green-600" : "text-red-600"}>
                      {provider.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ProviderTestButton provider={provider} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(provider)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the provider.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(provider.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {providers.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No providers configured. Add your first provider to get started.
          </div>
        )}
      </div>
      
      {isDialogOpen && (
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent className="sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {editingProvider ? "Edit Provider" : "Add Provider"}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Provider Name</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model">Model Name</Label>
                <Input
                  id="model"
                  value={formData.model || ""}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  value={formData.baseUrl || ""}
                  onChange={(e) => setFormData({...formData, baseUrl: e.target.value})}
                  placeholder="https://api.openai.com/v1"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey || ""}
                  onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                  required
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Enabled</Label>
                <Switch
                  id="enabled"
                  checked={formData.enabled !== undefined ? formData.enabled : true}
                  onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
                />
              </div>
              
              <AlertDialogFooter>
                <AlertDialogCancel type="button" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </AlertDialogCancel>
                <Button type="submit">
                  {editingProvider ? "Update" : "Create"}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}