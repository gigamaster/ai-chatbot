"use client";

import { notFound, redirect, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { useLocalAuth } from "@/contexts/local-auth-context";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import {
  getLocalChatById,
  getLocalMessagesByChatId,
} from "@/lib/local-db-queries";
import { convertToUIMessages } from "@/lib/utils";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user: localUser } = useLocalAuth();

  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Combined useEffect to handle params unwrapping and data fetching
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!localUser) {
      router.push("/local-login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Unwrap params to get chat ID
        const unwrappedParams = await params;

        // Handle case where id might be an array
        let chatId: string;
        if (Array.isArray(unwrappedParams.id)) {
          chatId = unwrappedParams.id[0];
        } else {
          chatId = unwrappedParams.id;
        }

        // Fetch chat data from IndexedDB
        const chatData = await getLocalChatById({ id: chatId });

        if (!chatData) {
          setError("Chat not found");
          return;
        }

        // Check if user is owner of the chat
        const isOwner = localUser?.id === chatData.userId;

        // Fetch messages from IndexedDB
        const messagesFromDb = await getLocalMessagesByChatId({ id: chatId });
        const uiMessages = convertToUIMessages(messagesFromDb);

        setChat({ ...chatData, isOwner });
        setMessages(uiMessages);
      } catch (err) {
        setError("Failed to load chat data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params, localUser, router]); // Add params to dependency array to trigger on navigation

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

  // Even stricter check - count how many messages there are
  const userMessages = messages.filter((msg) => msg.role === "user");
  const assistantMessages = messages.filter((msg) => msg.role === "assistant");
  const hasAssistantMessages = assistantMessages.length > 0;
  const shouldEnableAutoResume = hasAssistantMessages;

  return (
    <>
      <Chat
        autoResume={shouldEnableAutoResume}
        id={chat.id}
        initialChatModel={DEFAULT_CHAT_MODEL}
        initialLastContext={chat.lastContext ?? undefined}
        initialMessages={messages}
        isReadonly={!chat.isOwner}
      />
      <DataStreamHandler />
    </>
  );
}
