"use client";

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import type { Chat } from "@/lib/local-db";
import { getAllLocalChats } from "@/lib/local-db";
import { cn } from "@/lib/utils";
import { DotsHorizontalIcon, TrashIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { ChatItem } from "./sidebar-history-item";

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

// Add a function to fetch chats directly from IndexedDB
async function fetchChatsFromIndexedDB(userId: string) {
  try {
    console.log("Fetching chats from IndexedDB for userId:", userId);
    const chats = await getAllLocalChats(userId);
    console.log("Fetched chats:", chats);
    return chats;
  } catch (error) {
    console.error("Error fetching chats from IndexedDB:", error);
    return [];
  }
}

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats
  );
};

export function SidebarHistory({ user }: { user: any | undefined }) {
  const { setOpenMobile } = useSidebar();
  const params = useParams();
  const router = useRouter();
  
  // Unwrap the params to get the chat ID
  const [id, setId] = useState<string | null>(null);
  
  useEffect(() => {
    // Handle both Promise and direct object cases
    if (params instanceof Promise) {
      params.then((unwrappedParams) => {
        const chatId = unwrappedParams?.id;
        setId(Array.isArray(chatId) ? chatId[0] || null : chatId || null);
      });
    } else {
      const chatId = params?.id;
      setId(Array.isArray(chatId) ? chatId[0] || null : chatId || null);
    }
  }, [params]);

  // State for chat history
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch chats from IndexedDB
  const fetchChats = async () => {
    if (!user) return;
    
    setIsValidating(true);
    try {
      // Small delay to ensure IndexedDB operation is fully completed
      await new Promise(resolve => setTimeout(resolve, 50));
      const chats = await fetchChatsFromIndexedDB(user.id);
      console.log("Setting chat history:", chats);
      setChatHistory(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  };

  // Fetch chats when user changes or when component mounts
  useEffect(() => {
    fetchChats();
    
    // Listen for chatSaved events to refresh the chat history
    const handleChatSaved = () => {
      console.log("Received chatSaved event");
      fetchChats();
    };
    
    // Listen for chatHistoryUpdated events (e.g., after deleting all chats)
    const handleChatHistoryUpdated = () => {
      console.log("Received chatHistoryUpdated event");
      fetchChats();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('chatSaved', handleChatSaved);
      window.addEventListener('chatHistoryUpdated', handleChatHistoryUpdated);
    }
    
    // Cleanup event listeners
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('chatSaved', handleChatSaved);
        window.removeEventListener('chatHistoryUpdated', handleChatHistoryUpdated);
      }
    };
  }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      // Delete chat using client-side service instead of API call
      const { clientDbService } = await import('@/lib/client-db-service');
      const result = await clientDbService.deleteChat(deleteId);
      
      if (result.success) {
        // Refresh chat history
        await fetchChats();
        toast.success("Chat deleted successfully");
      } else {
        toast.error("Failed to delete chat");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast.error("Failed to delete chat");
    }

    setShowDeleteDialog(false);

    if (deleteId === id) {
      router.push("/");
    }
  };

  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-sm text-zinc-500">
            Login to save and revisit previous chats!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
          Today
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                className="flex h-8 items-center gap-2 rounded-md px-2"
                key={item}
              >
                <div
                  className="h-4 max-w-(--skeleton-width) flex-1 rounded-md bg-sidebar-accent-foreground/10"
                  style={
                    {
                      "--skeleton-width": `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (chatHistory.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-sm text-zinc-500">
            Your conversations will appear here once you start chatting!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const groupedChats = groupChatsByDate(chatHistory);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <div className="flex flex-col gap-6">
              {groupedChats.today.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
                    Today
                  </div>
                  {groupedChats.today.map((chat) => (
                    <ChatItem
                      chat={chat}
                      isActive={chat.id === id}
                      key={chat.id}
                      onDelete={(chatId) => {
                        setDeleteId(chatId);
                        setShowDeleteDialog(true);
                      }}
                      setOpenMobile={setOpenMobile}
                    />
                  ))}
                </div>
              )}

              {groupedChats.yesterday.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
                    Yesterday
                  </div>
                  {groupedChats.yesterday.map((chat) => (
                    <ChatItem
                      chat={chat}
                      isActive={chat.id === id}
                      key={chat.id}
                      onDelete={(chatId) => {
                        setDeleteId(chatId);
                        setShowDeleteDialog(true);
                      }}
                      setOpenMobile={setOpenMobile}
                    />
                  ))}
                </div>
              )}

              {groupedChats.lastWeek.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
                    Previous 7 Days
                  </div>
                  {groupedChats.lastWeek.map((chat) => (
                    <ChatItem
                      chat={chat}
                      isActive={chat.id === id}
                      key={chat.id}
                      onDelete={(chatId) => {
                        setDeleteId(chatId);
                        setShowDeleteDialog(true);
                      }}
                      setOpenMobile={setOpenMobile}
                    />
                  ))}
                </div>
              )}

              {groupedChats.lastMonth.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
                    Previous 30 Days
                  </div>
                  {groupedChats.lastMonth.map((chat) => (
                    <ChatItem
                      chat={chat}
                      isActive={chat.id === id}
                      key={chat.id}
                      onDelete={(chatId) => {
                        setDeleteId(chatId);
                        setShowDeleteDialog(true);
                      }}
                      setOpenMobile={setOpenMobile}
                    />
                  ))}
                </div>
              )}

              {groupedChats.older.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
                    Older
                  </div>
                  {groupedChats.older.map((chat) => (
                    <ChatItem
                      chat={chat}
                      isActive={chat.id === id}
                      key={chat.id}
                      onDelete={(chatId) => {
                        setDeleteId(chatId);
                        setShowDeleteDialog(true);
                      }}
                      setOpenMobile={setOpenMobile}
                    />
                  ))}
                </div>
              )}
            </div>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Refresh button */}
      <div className="flex justify-center">
        <button
          disabled={isValidating}
          className="text-center px-3 py-2"
          onClick={fetchChats}
        >
          {isValidating ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Delete dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-2">Are you absolutely sure?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. This will permanently delete your chat.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}