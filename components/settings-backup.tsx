"use client";

import { downloadZip } from "client-zip";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalAuth } from "@/contexts/local-auth-context";
import { getAllLocalChats, getLocalMessages } from "@/lib/local-db";
import { getAllCustomProviders } from "@/lib/local-db-queries";

export function DatabaseStats() {
  const { user: localUser } = useLocalAuth();
  const [databaseStats, setDatabaseStats] = useState({
    totalProviders: 0,
    totalModels: 0,
    totalChats: 0,
    totalMessages: 0,
    userId: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatabaseStats = async () => {
      if (!localUser?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get all providers
        const providers = await getAllCustomProviders();

        // Get all chats for user
        const chats = await getAllLocalChats(localUser.id);

        // Get messages for all chats
        let totalMessages = 0;
        for (const chat of chats) {
          const messages = await getLocalMessages(chat.id);
          totalMessages += messages.length;
        }

        // Calculate models from providers
        const models = providers.length; // Each provider has one model

        setDatabaseStats({
          totalProviders: providers.length,
          totalModels: models,
          totalChats: chats.length,
          totalMessages,
          userId: localUser.id,
        });
      } catch (error) {
        console.error("Failed to fetch database stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDatabaseStats();
  }, [localUser?.id]);

  const exportDatabaseAsJson = async () => {
    if (!localUser?.id) {
      return;
    }

    try {
      // Collect all data
      const providers = await getAllCustomProviders();
      const chats = await getAllLocalChats(localUser.id);
      const allData = {
        userId: localUser.id,
        exportedAt: new Date().toISOString(),
        providers,
        chats,
        messages: {} as Record<string, any[]>,
      };

      // Get messages for each chat
      for (const chat of chats) {
        allData.messages[chat.id] = await getLocalMessages(chat.id);
      }

      // Create downloadable JSON file
      const dataStr = JSON.stringify(allData, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      const exportFileDefaultName = `database-backup-${localUser.id}.json`;
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error("Failed to export database as JSON:", error);
    }
  };

  const exportDatabaseAsZip = async () => {
    if (!localUser?.id) {
      return;
    }

    try {
      // Collect all data
      const providers = await getAllCustomProviders();
      const chats = await getAllLocalChats(localUser.id);

      // Prepare files for ZIP
      const files: any[] = [];

      // Add providers file
      files.push({
        name: "providers.json",
        lastModified: new Date(),
        input: JSON.stringify(providers, null, 2),
      });

      // Add chats file
      files.push({
        name: "chats.json",
        lastModified: new Date(),
        input: JSON.stringify(chats, null, 2),
      });

      // Add messages files (one per chat)
      for (const chat of chats) {
        const messages = await getLocalMessages(chat.id);
        files.push({
          name: `messages-${chat.id}.json`,
          lastModified: new Date(),
          input: JSON.stringify(messages, null, 2),
        });
      }

      // Add metadata file
      const metadata = {
        userId: localUser.id,
        exportedAt: new Date().toISOString(),
        stats: databaseStats,
      };
      files.push({
        name: "metadata.json",
        lastModified: new Date(),
        input: JSON.stringify(metadata, null, 2),
      });

      // Create and download ZIP
      const blob = await downloadZip(files).blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ai-chatbot-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
    } catch (error) {
      console.error("Failed to export database as ZIP:", error);
      alert("Failed to export database as ZIP. Check console for details.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div className="rounded-lg border p-4" key={i}>
              <div className="h-8 w-12 animate-pulse rounded-md bg-muted" />
              <div className="mt-2 h-4 w-24 animate-pulse rounded-md bg-muted" />
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded-md bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
                <div className="flex gap-4">
                  <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">
            {databaseStats.totalProviders}
          </div>
          <div className="text-muted-foreground text-sm">Total Providers</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{databaseStats.totalModels}</div>
          <div className="text-muted-foreground text-sm">Total Models</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{databaseStats.totalChats}</div>
          <div className="text-muted-foreground text-sm">Total Chats</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">
            {databaseStats.totalMessages}
          </div>
          <div className="text-muted-foreground text-sm">Total Messages</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Backup</CardTitle>
          <p className="text-muted-foreground text-sm">
            All usage data is stored locally on your device and never sent to
            any server.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="font-medium">
                {localUser?.email || databaseStats.userId}
              </div>
              <div className="flex gap-4">
                <Button
                  className="text-sm"
                  onClick={exportDatabaseAsJson}
                  size="sm"
                  variant="secondary"
                >
                  Export Json
                </Button>
                <Button
                  className="text-sm"
                  onClick={exportDatabaseAsZip}
                  size="sm"
                  variant="secondary"
                >
                  Export Zip
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
