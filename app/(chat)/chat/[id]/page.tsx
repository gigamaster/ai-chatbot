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
  
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Combined useEffect to handle params unwrapping and data fetching
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!localUser) {
      console.log("No local user, redirecting to login");
      router.push("/local-login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Starting to fetch data...");
        
        // Unwrap params to get chat ID
        console.log("Params before unwrapping:", params);
        const unwrappedParams = await params;
        console.log("Unwrapped params:", unwrappedParams);
        
        // Handle case where id might be an array
        let chatId: string;
        if (Array.isArray(unwrappedParams.id)) {
          chatId = unwrappedParams.id[0];
        } else {
          chatId = unwrappedParams.id;
        }
        
        console.log("Chat ID:", chatId);
        
        // Fetch chat data from IndexedDB
        console.log("Fetching chat data...");
        const chatData = await getLocalChatById({ id: chatId });
        console.log("Chat data fetched:", chatData);
        
        if (!chatData) {
          console.log("No chat data found for ID:", chatId);
          setError("Chat not found");
          return;
        }

        // Check if user is owner of the chat
        const isOwner = localUser?.id === chatData.userId;
        console.log("User ID:", localUser?.id, "Chat user ID:", chatData.userId, "Is owner:", isOwner);
        
        // Remove visibility check since we're removing visibility functionality
        // if (chatData.visibility === "private" && !isOwner) {
        //   console.log("Access denied for private chat");
        //   setError("Access denied");
        //   return;
        // }

        // Fetch messages from IndexedDB
        console.log("Fetching messages for chat ID:", chatId);
        const messagesFromDb = await getLocalMessagesByChatId({ id: chatId });
        console.log("Messages fetched from DB:", messagesFromDb);
        const uiMessages = convertToUIMessages(messagesFromDb);
        console.log("UI messages converted:", uiMessages);

        setChat({ ...chatData, isOwner });
        setMessages(uiMessages);
        console.log("State updated with chat and messages");
      } catch (err) {
        console.error("Error fetching chat data:", err);
        setError("Failed to load chat data");
      } finally {
        setLoading(false);
        console.log("Finished loading data");
      }
    };

    fetchData();
  }, [params, localUser, router]); // Add params to dependency array to trigger on navigation

  // Handle loading state
  if (loading) {
    console.log("Rendering loading state");
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading chat...</div>
      </div>
    );
  }

  // Handle error states
  if (error) {
    console.log("Rendering error state:", error);
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
    console.log("No chat data, rendering not found");
    return notFound();
  }

  console.log("Rendering chat component with data:", { chat, messages });
  
  // CRITICAL FIX: Determine if we should enable autoResume
  // The issue is that when a user sends their FIRST message:
  // 1. A new chat is created with a user message
  // 2. The user gets redirected to /chat/[id] 
  // 3. The system sees the chat has messages and enables autoResume
  // 4. This causes duplication of the first assistant response
  //
  // Solution: Only enable autoResume if there are ASSISTANT messages
  // (indicating a previous conversation that was interrupted)
  
  // Even stricter check - count how many messages there are
  const userMessages = messages.filter(msg => msg.role === "user");
  const assistantMessages = messages.filter(msg => msg.role === "assistant");
  const hasAssistantMessages = assistantMessages.length > 0;
  const shouldEnableAutoResume = hasAssistantMessages;
  
  console.log("=== CRITICAL CHAT LOADING DEBUG ===");
  console.log("Chat ID:", chat.id);
  console.log("Total message count:", messages.length);
  console.log("User messages count:", userMessages.length);
  console.log("Assistant messages count:", assistantMessages.length);
  console.log("Messages:", JSON.stringify(messages, null, 2));
  console.log("Has assistant messages:", hasAssistantMessages);
  console.log("Should enable autoResume:", shouldEnableAutoResume);
  console.log("REASONING: Only enable autoResume if there are assistant messages (previous responses)");
  console.log("=== END CRITICAL DEBUG ===");

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
