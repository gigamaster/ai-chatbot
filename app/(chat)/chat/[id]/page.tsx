"use client";

import { notFound, redirect, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useLocalAuth } from "@/contexts/local-auth-context";

import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLocalChatById, getLocalMessagesByChatId } from "@/lib/local-db-queries";
import { convertToUIMessages } from "@/lib/utils";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user: localUser } = useLocalAuth();
  const [id, setId] = useState<string | null>(null);
  
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unwrap the params Promise
  useEffect(() => {
    const unwrapParams = async () => {
      const { id: chatId } = await params;
      setId(chatId);
    };
    
    unwrapParams();
  }, [params]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!localUser || !id) {
      if (!localUser) {
        router.push("/local-login");
      }
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch chat data from IndexedDB
        const chatData = await getLocalChatById({ id });
        
        if (!chatData) {
          setError("Chat not found");
          return;
        }

        // Check if user is owner of the chat
        const isOwner = localUser?.id === chatData.userId;
        
        if (chatData.visibility === "private" && !isOwner) {
          setError("Access denied");
          return;
        }

        // Fetch messages from IndexedDB
        const messagesFromDb = await getLocalMessagesByChatId({ id });
        const uiMessages = convertToUIMessages(messagesFromDb);

        setChat({ ...chatData, isOwner });
        setMessages(uiMessages);
      } catch (err) {
        console.error("Error fetching chat data:", err);
        setError("Failed to load chat data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, localUser, router]);

  // Handle loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading chat...</div>
      </div>
    );
  }

  // Handle error states
  if (error) {
    if (error === "Chat not found") {
      return notFound();
    }
    if (error === "Access denied") {
      return notFound();
    }
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  // Handle case where chat data failed to load
  if (!chat) {
    return notFound();
  }

  return (
    <>
      <Chat
        autoResume={true}
        id={chat.id}
        initialChatModel={DEFAULT_CHAT_MODEL}
        initialLastContext={chat.lastContext ?? undefined}
        initialMessages={messages}
        initialVisibilityType={chat.visibility}
        isReadonly={!chat.isOwner}
      />
      <DataStreamHandler />
    </>
  );
}