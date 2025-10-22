"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ClearDatabasePage() {
  const handleClearDatabase = async () => {
    if (typeof window !== "undefined" && window.indexedDB) {
      try {
        // Close any open connections first
        const openReq = indexedDB.open("codemo-db");
        openReq.onsuccess = () => {
          const db = openReq.result;
          db.close();
        };

        // Delete the database
        const deleteReq = indexedDB.deleteDatabase("codemo-db");

        deleteReq.onsuccess = () => {
          toast.success(
            "Database cleared successfully. Please refresh the page."
          );
        };

        deleteReq.onerror = () => {
          toast.error("Error clearing database");
        };

        deleteReq.onblocked = () => {
          toast.warning(
            "Database clearing blocked. Please close all other tabs and try again."
          );
        };
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to clear database");
      }
    } else {
      toast.error("IndexedDB not supported in this browser");
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-3xl">Clear Database</h1>
          <p className="text-muted-foreground">
            Utility to clear the local database and reset provider
            configurations
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              This will clear all your local data including providers, chats,
              and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                If you're experiencing issues with the AI provider settings, you
                can clear the local database to reset everything. This will
                remove all your configured providers and reset to defaults.
              </p>
              <Button onClick={handleClearDatabase} variant="destructive">
                Clear Database
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
